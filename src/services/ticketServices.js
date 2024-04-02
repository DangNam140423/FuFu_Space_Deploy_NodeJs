import db from '../models/index';
require('dotenv').config();
const Sequelize = require('sequelize');
import sendMailServices from './sendMailServices';
import tableServices from './tableServices';
import { v4 as uuidv4 } from 'uuid';
const Op = Sequelize.Op;
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { Mutex } = require('async-mutex');
// Khởi tạo một Mutex
const mutex = new Mutex();



let getAllTicket = (dataInput) => {
    return new Promise(async (resolve, reject) => {
        try {
            const today = new Date(dataInput.date);
            today.setUTCHours(0, 0, 0, 0); // Đặt giờ, phút, giây và millisecond về 0 để có thời điểm bắt đầu ngày

            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            let ticket = [];
            if (dataInput.dataSearch === 'All' || dataInput.dataSearch === '') {
                ticket = await db.Ticket.findAll({
                    include: [
                        { model: db.User, as: 'staffData', attributes: ['id', 'fullName'] },
                        { model: db.Schedule, as: 'scheduleData', attributes: ['id', 'date', 'timeType'] },
                        // { model: db.Table },
                    ],
                    where: {
                        '$scheduleData.date$': {
                            [Op.between]: [today, tomorrow],
                        },
                    },
                    // where: {
                    //     createdAt: {
                    //         [db.Sequelize.Op.between]: [today, tomorrow],
                    //     },
                    // },
                    order: [[db.Sequelize.col('createdAt'), 'ASC']],
                    raw: true,
                    nest: true
                });
            } else {
                ticket = await db.Ticket.findAll({
                    include: [
                        { model: db.User, as: 'staffData', attributes: ['id', 'fullName'] },
                        { model: db.Schedule, as: 'scheduleData', attributes: ['id', 'date', 'timeType'] },
                    ],
                    where: {
                        [Op.or]: [
                            db.sequelize.literal(`CAST("Ticket"."id" AS TEXT) = '${parseInt(dataInput.dataSearch.toString(), 10)}'`),
                            { nameCustomer: { [Op.iLike]: '%' + dataInput.dataSearch + '%' } },
                            { phoneCustomer: dataInput.dataSearch }
                        ],
                        // createdAt: {
                        //     [Sequelize.Op.between]: [today, tomorrow],
                        // },
                        '$scheduleData.date$': {
                            [Op.between]: [today, tomorrow],
                        },
                    },
                    order: [[db.Sequelize.col('createdAt'), 'ASC']],
                    raw: true,
                    nest: true
                });
            }

            for (let j = 0; j < ticket.length; j++) {
                let timeSlot = await db.Allcode.findOne({
                    where: { keyMap: ticket[j].scheduleData.timeType },
                    attributes: ['valueVi', 'valueEn']
                })
                ticket[j].timeSlot = await timeSlot;
            }

            for (let i = 0; i < ticket.length; i++) {
                let table = await db.Ticket.findAll({
                    where: { id: ticket[i].id },
                    include: [
                        { model: db.Table },
                    ],
                    raw: true,
                    nest: true
                })
                let tableString = '';
                let groupTable = ''
                table.map(item => {
                    switch (item.Tables.idGroup) {
                        case 1:
                            groupTable = 'A'
                            break;
                        case 2:
                            groupTable = 'B'
                            break;
                        case 3:
                            groupTable = 'C'
                            break;
                        case 4:
                            groupTable = 'D'
                            break;
                        case 5:
                            groupTable = 'E'
                            break;
                        case 6:
                            groupTable = 'F'
                            break;
                        case 7:
                            groupTable = 'G'
                            break;
                        default:
                            break;
                    }
                    tableString = tableString + item.Tables.maxPeople + groupTable + item.Tables.tableNumber + ', '
                })
                ticket[i].tableString = tableString.slice(0, -2);
            }

            resolve(ticket);
        } catch (error) {
            reject(error);
        }
    });
}

let getSummaryTicket = (date) => {
    return new Promise(async (resolve, reject) => {
        try {
            const today = new Date(date);
            today.setUTCHours(0, 0, 0, 0); // Đặt giờ, phút, giây và millisecond về 0 để có thời điểm bắt đầu ngày

            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            let summaryTicket = await db.Ticket.findAll({
                attributes: [
                    [
                        db.Sequelize.fn(
                            'SUM',
                            db.Sequelize.literal('("bill" + "priceOrder")')
                        ),
                        'totalRevenue',
                    ],
                    [db.Sequelize.fn('COUNT', db.Sequelize.col('Ticket.id')), 'totalTicket'],
                    [db.Sequelize.fn('SUM', db.Sequelize.col('Ticket.numberPeople')), 'totalCustomer'],
                    [db.Sequelize.fn('SUM', db.Sequelize.col('Ticket.numberAdult')), 'numberAdult'],
                    [db.Sequelize.fn('SUM', db.Sequelize.col('Ticket.numberKid')), 'numberKid'],
                    [db.Sequelize.fn('SUM', db.Sequelize.col('Ticket.numberAdultBest')), 'numberAdultBest'],
                    [db.Sequelize.fn('SUM', db.Sequelize.col('Ticket.numberKidBest')), 'numberKidBest'],
                ],
                include: [
                    { model: db.Schedule, as: 'scheduleData', attributes: ['date'] },
                ],
                where: {
                    '$scheduleData.date$': {
                        [Op.between]: [today, tomorrow],
                    },
                    payStatus: true,
                },
                group: ['scheduleData.date',],
                raw: true,
                nest: true
            });

            resolve(summaryTicket);

        } catch (error) {
            reject(error);
        }
    });
}

let buildUrlEmail = (idTicket, payToken) => {
    let result = `${process.env.URL_REACT}/verify-ticket?payToken=${payToken}&ticketId=${idTicket}`;

    return result
}


let buildUrlEmailCancle = (idTicket, payToken) => {
    let result = `${process.env.URL_REACT}/verify-ticket?cancle=${true}&payToken=${payToken}&ticketId=${idTicket}`;

    return result
}

let createTicketByCustomer = (dataTicket) => {
    return new Promise(async (resolve, reject) => {
        const release = await mutex.acquire();
        try {
            if (!dataTicket || !dataTicket.timeType || !dataTicket.date ||
                !dataTicket.phoneCustomer || !dataTicket.nameCustomer || !dataTicket.email ||
                !dataTicket.numberTicketType ||
                !dataTicket.arrIdTable || dataTicket.arrIdTable.length <= 0 ||
                !dataTicket.imageBill
            ) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                });
            } else {
                // arrTable này sẽ là những ghế không thể chọn, vì đã có người chọn trước
                let tableNotEmpty = await tableServices.getTableEmptyByScheduleToBooking({
                    date: dataTicket.date,
                    timeType: dataTicket.timeType
                });

                let arrIdTableCheck = []
                let arrGroupTable = [];
                for (let i = 0; i < dataTicket.arrIdTable.length; i++) {
                    let idTableFind = await db.Table.findOne({
                        where: {
                            id: dataTicket.arrIdTable[i],
                            status: true
                        }
                    });
                    if (idTableFind) {
                        arrIdTableCheck.push(idTableFind);
                        arrGroupTable.push(idTableFind.idGroup);
                    }
                }


                if (!arrIdTableCheck || arrIdTableCheck.length != dataTicket.arrIdTable.length
                ) {
                    resolve({
                        errCode: 2,
                        errMessage: "Không tìm ra bàn này",
                    });
                } else {
                    let hasCommonId = arrIdTableCheck.some(elementA => tableNotEmpty.some(elementB => elementB.id === elementA.id));
                    if (hasCommonId) {
                        resolve({
                            errCode: 4,
                            errMessage: "Bàn này đã được đặt, vui lòng chọn bàn khác",
                        });
                    } else {
                        let price = 0;
                        let numberAdultBest = dataTicket.numberTicketType.numberAdultBest;
                        let numberKidBest = dataTicket.numberTicketType.numberKidBest;

                        price = (numberAdultBest * process.env.PRICE_TICKET_ADULT_BEST)
                            + (numberKidBest * process.env.PRICE_TICKET_KID_BEST)

                        let numberPeople = (
                            numberAdultBest * 1 + numberKidBest * 1
                        )

                        let arrSchedule = await db.Schedule.findOne({
                            where: {
                                date: new Date(dataTicket.date),
                                timeType: dataTicket.timeType,
                                idGroup: arrGroupTable
                            }
                        })

                        let ticketType = "";

                        if (numberAdultBest > 0) {
                            ticketType = ticketType + numberAdultBest + " vé người lớn ( online ), "
                        }
                        if (numberKidBest > 0) {
                            ticketType = ticketType + numberKidBest + " vé trẻ em ( online )"
                        }

                        let transaction;
                        try {
                            transaction = await db.sequelize.transaction();
                            const payToken = uuidv4();

                            let ticket = await db.Ticket.create({
                                idSchedule: arrSchedule.id,
                                phoneCustomer: dataTicket.phoneCustomer,
                                nameCustomer: dataTicket.nameCustomer,
                                emailCustomer: dataTicket.email,
                                numberPeople: numberPeople,
                                ticketType: ticketType,
                                numberAdult: 0,
                                numberKid: 0,
                                numberAdultBest: numberAdultBest,
                                numberKidBest: numberKidBest,
                                idStaff: 0,
                                bill: price,
                                payToken,
                                payStatus: false,
                                receiveStatus: false
                            }, transaction)

                            let ticketId = ticket.id;

                            // Liên kết Ticket với các bản ghi Table thông qua mô hình trung gian TicketTable
                            if (ticket) {
                                await ticket.addTables(dataTicket.arrIdTable, { transaction });
                                await handleSenMail(dataTicket, ticket);
                                await transaction.commit();

                                resolve({
                                    errCode: 0,
                                    errMessage: "Create a new ticket success",
                                    ticketId
                                });
                            } else {
                                await transaction.rollback(); // Rollback transaction nếu không tồn tại ticket
                                resolve({
                                    errCode: 3,
                                    errMessage: "Ticket is undefined.",
                                });
                            }
                        } catch (error) {
                            if (transaction) await transaction.rollback();
                            reject(error);
                        }
                    }
                }
            }
            release();
        } catch (error) {
            release();
            reject(error);
        }
    })
}


let handleSenMail = async (dataTicket, ticket) => {

    const dateToMail = new Date(dataTicket.date);
    var day = dateToMail.getDate();
    var month = dateToMail.getMonth() + 1; // Lưu ý: Tháng bắt đầu từ 0 nên cần cộng thêm 1
    var year = dateToMail.getFullYear();

    // Định dạng lại ngày, tháng, năm theo định dạng mong muốn (dd/MM/YYYY)
    var formattedDate = (day < 10 ? '0' : '') + day + '/' + (month < 10 ? '0' : '') + month + '/' + year;


    let timeSlot = await db.Allcode.findOne({
        where: { keyMap: dataTicket.timeType },
        attributes: ['valueVi', 'valueEn']
    })

    // Chuỗi base64 của hình ảnh
    const base64Image = dataTicket.imageBill

    // Tạo buffer từ chuỗi base64
    const base64Data = base64Image.replace(/^data:image\/png;base64,/, '');

    const currentDate = new Date().getTime().toString();

    // Tạo tên tệp dựa trên ngày giờ hiện tại
    const fileName = `billImage_${currentDate}.jpg`;
    const filePath = `./imageBill/${fileName}`;

    // Ghi dữ liệu base64 vào tệp
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Lỗi khi lưu ảnh:', err);
        }
    });


    await sendMailServices.handleSendMailSystemTicket({
        formattedDate,
        timeType: timeSlot.valueVi,
        phoneCustomer: dataTicket.phoneCustomer,
        nameCustomer: dataTicket.nameCustomer,
        emailCustomer: dataTicket.email,
        fileName,
        filePath,
        numberAdultBest: ticket.numberAdultBest,
        numberKidBest: ticket.numberKidBest,
        bill: ticket.bill,
        redirectLink: buildUrlEmail(ticket.id, ticket.payToken),
        redirectLinkCancle: buildUrlEmailCancle(ticket.id, ticket.payToken),
    });

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error("Lỗi khi xóa file:", err);
        }
    });
}


let verifyTicket = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.ticketId || !data.payToken) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter'
                })
            } else {
                let ticket = await db.Ticket.findOne({
                    where: {
                        id: data.ticketId,
                        payToken: data.payToken,
                        payStatus: false
                    }
                })

                if (ticket) {
                    let transaction;
                    try {
                        transaction = await db.sequelize.transaction();
                        await db.Ticket.update(
                            { payStatus: true },
                            { where: { id: ticket.id } },
                            transaction
                        );


                        // FIRE RESPONSES
                        let schedule = await db.Schedule.findOne({
                            where: {
                                id: ticket.idSchedule
                            },
                            attributes: ['date', 'timeType']
                        })

                        let timeSlot = await db.Allcode.findOne({
                            where: { keyMap: schedule.timeType },
                            attributes: ['valueVi', 'valueEn']
                        })

                        await sendMailServices.handleMailResponses({
                            phoneCustomer: ticket.phoneCustomer,
                            nameCustomer: ticket.nameCustomer,
                            emailCustomer: ticket.emailCustomer,
                            timeType: timeSlot.valueVi,
                            numberAdultBest: ticket.numberAdultBest,
                            numberKidBest: ticket.numberKidBest,
                            bill: ticket.bill,
                            numberPeople: ticket.numberPeople,
                            date: moment(schedule.date).format('DD/MM/YYYY')
                        }, { transaction });

                        await transaction.commit();

                        resolve({
                            errCode: 0,
                            errMessage: `Confirm`
                        });
                    } catch (error) {
                        if (transaction) await transaction.rollback();
                        reject(error);
                    }
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: `This ticket does not exist or has been claimed by another member`
                    });
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}

let verifyTicketCancle = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.ticketId || !data.payToken) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter'
                })
            } else {
                let ticket = await db.Ticket.findOne({
                    where: {
                        id: data.ticketId,
                        payToken: data.payToken,
                        payStatus: false
                    }
                })

                if (ticket) {
                    let transaction;
                    try {
                        transaction = await db.sequelize.transaction();
                        // Xóa các bản ghi liên quan từ bảng trung gian
                        await db.TicketTable.destroy({
                            where: { ticketId: ticket.id },
                            transaction
                        });

                        // Sau đó xóa Ticket
                        await db.Ticket.destroy({
                            where: { id: ticket.id },
                            transaction
                        });


                        // FIRE RESPONSES
                        let schedule = await db.Schedule.findOne({
                            where: {
                                id: ticket.idSchedule
                            },
                            attributes: ['date', 'timeType']
                        })

                        let timeSlot = await db.Allcode.findOne({
                            where: { keyMap: schedule.timeType },
                            attributes: ['valueVi', 'valueEn']
                        })

                        await sendMailServices.handleMailResponsesCancle({
                            phoneCustomer: ticket.phoneCustomer,
                            nameCustomer: ticket.nameCustomer,
                            emailCustomer: ticket.emailCustomer,
                            timeType: timeSlot.valueVi,
                            numberAdultBest: ticket.numberAdultBest,
                            numberKidBest: ticket.numberKidBest,
                            bill: ticket.bill,
                            numberPeople: ticket.numberPeople,
                            date: moment(schedule.date).format('DD/MM/YYYY')
                        }, { transaction });

                        await transaction.commit();
                        resolve({
                            errCode: 0,
                            errMessage: `Cancle`
                        })

                    } catch (error) {
                        console.log(error);
                        // Rollback transaction nếu có lỗi
                        if (transaction) {
                            await transaction.rollback();
                        }
                        reject(error);
                    }
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: `This ticket does not exist or has been claimed by another member`
                    });
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}


let createTicket = (dataTicket) => {
    return new Promise(async (resolve, reject) => {
        const release2 = await mutex.acquire();
        try {
            if (!dataTicket || !dataTicket.timeType || !dataTicket.date ||
                !dataTicket.phoneCustomer || !dataTicket.nameCustomer ||
                // !dataTicket.numberPeople || !dataTicket.ticketType
                !dataTicket.numberTicketType ||
                !dataTicket.idStaff || !dataTicket.arrIdTable || dataTicket.arrIdTable.length <= 0
            ) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                });
            } else {
                let tableNotEmpty = await tableServices.getTableEmptyByScheduleToBooking({
                    date: dataTicket.date,
                    timeType: dataTicket.timeType
                });

                let arrIdTableCheck = []
                let arrGroupTable = [];
                for (let i = 0; i < dataTicket.arrIdTable.length; i++) {
                    let idTableFind = await db.Table.findOne({
                        where: {
                            id: dataTicket.arrIdTable[i],
                            status: true
                        }
                    });
                    if (idTableFind) {
                        arrIdTableCheck.push(idTableFind);
                        arrGroupTable.push(idTableFind.idGroup);
                    }
                }
                // let allCode = await db.Allcode.findOne({
                //     where: { keyMap: dataTicket.ticketType }
                // });

                let idStaffFind = await db.User.findOne({
                    where: {
                        id: dataTicket.idStaff,
                        roleId: {
                            [db.Sequelize.Op.or]: ['R0', 'R1', 'R2']
                        },
                        status: true
                    }
                });

                if (!arrIdTableCheck || arrIdTableCheck.length != dataTicket.arrIdTable.length ||
                    !idStaffFind
                ) {
                    resolve({
                        errCode: 2,
                        errMessage: "Không tìm ra Bàn, hoặc Nhân viên này",
                    });
                } else {
                    let hasCommonId = arrIdTableCheck.some(elementA => tableNotEmpty.some(elementB => elementB.id === elementA.id));
                    if (hasCommonId) {
                        resolve({
                            errCode: 4,
                            errMessage: "Bàn này đã được đặt, vui lòng chọn bàn khác",
                        });
                    } else {
                        let price = 0;
                        let numberAdult = dataTicket.numberTicketType.numberAdult;
                        let numberKid = dataTicket.numberTicketType.numberKid;
                        let numberAdultBest = dataTicket.numberTicketType.numberAdultBest;
                        let numberKidBest = dataTicket.numberTicketType.numberKidBest;
                        let numberDiscount = dataTicket.numberTicketType.numberDiscount;

                        price = (numberAdult * process.env.PRICE_TICKET_ADULT)
                            + (numberKid * process.env.PRICE_TICKET_KID)
                            + (numberAdultBest * process.env.PRICE_TICKET_ADULT_BEST)
                            + (numberKidBest * process.env.PRICE_TICKET_KID_BEST)
                            + (numberDiscount * process.env.PRICE_TICKET_DISCOUNT)

                        let numberPeople = (
                            numberAdult * 1 + numberKid * 1
                            + numberAdultBest * 1 + numberKidBest * 1
                            + numberDiscount * 1
                        )


                        let arrSchedule = await db.Schedule.findOne({
                            where: {
                                date: new Date(dataTicket.date),
                                timeType: dataTicket.timeType,
                                idGroup: arrGroupTable
                            }
                        })

                        let ticketType = "";
                        if (numberAdult > 0) {
                            ticketType = ticketType + numberAdult + " vé người lớn, "
                        }
                        if (numberAdultBest > 0) {
                            ticketType = ticketType + numberAdultBest + " vé người lớn ( online ), "
                        }
                        if (numberKid > 0) {
                            ticketType = ticketType + numberKid + " vé trẻ em, "
                        }
                        if (numberKidBest > 0) {
                            ticketType = ticketType + numberKidBest + " vé trẻ em ( online ), "
                        }
                        if (numberDiscount > 0) {
                            ticketType = ticketType + numberDiscount + " vé discount"
                        }
                        let transaction;
                        try {
                            transaction = await db.sequelize.transaction();

                            let ticket = await db.Ticket.create({
                                idSchedule: arrSchedule.id,
                                phoneCustomer: dataTicket.phoneCustomer,
                                nameCustomer: dataTicket.nameCustomer,
                                numberPeople: numberPeople,
                                ticketType: ticketType,
                                numberAdult: numberAdult,
                                numberKid: numberKid,
                                numberAdultBest: numberAdultBest,
                                numberKidBest: numberKidBest,
                                idStaff: dataTicket.idStaff,
                                bill: price,
                                payStatus: true,
                                receiveStatus: dataTicket.receiveStatus
                            }, { transaction })

                            let ticketId = ticket.id;

                            // Liên kết Ticket với các bản ghi Table thông qua mô hình trung gian TicketTable
                            if (ticket) {
                                await ticket.addTables(dataTicket.arrIdTable, { transaction });
                                await transaction.commit();
                                resolve({
                                    errCode: 0,
                                    errMessage: "Create a new ticket success",
                                    ticketId
                                });
                            } else {
                                await transaction.rollback(); // Rollback transaction nếu không tồn tại ticket
                                resolve({
                                    errCode: 3,
                                    errMessage: "Ticket is undefined.",
                                });
                            }
                        } catch (error) {
                            if (transaction) await transaction.rollback();
                            reject(error);
                        }
                    }
                }
            }
            release2();
        } catch (error) {
            release2();
            reject(error);
        }
    })
}



let updateTicket = (dataTicket, infoUser) => {
    return new Promise(async (resolve, reject) => {
        try {
            const ticket = await db.Ticket.findOne({
                where: { id: dataTicket.id }
            })
            if (!ticket) {
                resolve({
                    errCode: 1,
                    errMessage: `Ticket not found`
                });
            } else {
                let check = false;
                // Lúc này có 3 type để sửa ( thông tin vé, trạng thái nhận vé, trạng thái thanh toán)
                if (dataTicket.date && dataTicket.timeType && dataTicket.arrIdTable && dataTicket.arrIdTable.length > 0
                    && typeof dataTicket.payStatus === 'undefined'
                    && typeof dataTicket.receiveStatus === 'undefined') {
                    if (infoUser.roleId === 'R0') {
                        check = await updateInfo(dataTicket); // sửa info ticket
                    } else {
                        resolve({
                            errCode: 3,
                            errMessage: `You don't permission to access this resource ...`
                        });
                    }
                } else if (!dataTicket.receiveStatus && typeof dataTicket.payStatus === 'undefined') {
                    check = await updateReceive(dataTicket); // sửa trạng thái nhận vé
                } else if (!dataTicket.payStatus && typeof dataTicket.receiveStatus === 'undefined') {
                    check = await updatePayStatus(dataTicket); // sửa trạng thái thanh toán
                } else {
                    check = false;
                }

                if (check) {
                    resolve({
                        errCode: 0,
                        errMessage: `Update success`
                    });
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: `Update failed`
                    });
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}


let updateInfo = async (dataTicket) => {
    try {
        let arrGroupTable = [];
        for (let i = 0; i < dataTicket.arrIdTable.length; i++) {
            let idTableFind = await db.Table.findOne({
                where: {
                    id: dataTicket.arrIdTable[i],
                    status: true
                }
            });
            if (idTableFind) {
                arrGroupTable.push(idTableFind.idGroup);
            }
        }


        let arrSchedule = await db.Schedule.findOne({
            where: {
                date: new Date(dataTicket.date),
                timeType: dataTicket.timeType,
                idGroup: arrGroupTable
            }
        })

        let transaction;
        try {
            // Bắt đầu transaction
            transaction = await db.sequelize.transaction();

            // Xóa các bản ghi liên quan từ bảng trung gian
            await db.TicketTable.destroy({
                where: { ticketId: dataTicket.id },
                transaction
            })
            // Sửa lại thông tin vé
            const [rowCount, [updatedTicket]] = await db.Ticket.update(
                { idSchedule: arrSchedule.id, },
                {
                    where: {
                        id: dataTicket.id,
                    },
                    returning: true, // Để nhận lại dòng được cập nhật
                    transaction
                }
            );

            // Liên kết Ticket với các bản ghi Table thông qua mô hình trung gian TicketTable
            if (updatedTicket) {
                for (let j = 0; j < dataTicket.arrIdTable.length; j++) {
                    await db.TicketTable.create({
                        ticketId: dataTicket.id,
                        tableId: dataTicket.arrIdTable[j]
                    }, { transaction });
                }
                // Commit transaction
                await transaction.commit();

                return true;
            } else {
                // Rollback transaction nếu có lỗi
                await transaction.rollback();
                return false;
            }

        } catch (error) {
            console.log(error);
            // Rollback transaction nếu có lỗi
            if (transaction) {
                await transaction.rollback();
            }

            return false;
        }
    } catch (error) {
        console.log(error)
        return false;
    }
}


let updateReceive = async (dataTicket) => {
    try {
        let updateTicket = await db.Ticket.update({
            receiveStatus: true
        }, {
            where: { id: dataTicket.id }
        });

        if (!updateTicket) {
            return false;
        } else {
            return true;
        }

    } catch (error) {
        console.log(error);
        return false;
    }
}


let updatePayStatus = async (dataTicket) => {
    try {
        let updateTicket = await db.Ticket.update({
            payStatus: true
        }, {
            where: { id: dataTicket.id }
        });

        if (!updateTicket) {
            return false;
        } else {
            return true;
        }

    } catch (error) {
        console.log(error);
        return false;
    }
}


let updateTicketOrder = (dataTicket, arrOrder) => {
    return new Promise(async (resolve, reject) => {
        try {
            let ticket = await db.Ticket.findOne({
                where: { id: dataTicket.id }
            })
            if (!ticket) {
                resolve({
                    errCode: 1,
                    errMessage: `Ticket not found`
                });
            } else {
                if (arrOrder <= 0) {
                    resolve({
                        errCode: 2,
                        errMessage: `Count dish <= 0`
                    });
                } else {
                    let dishOrder = ticket.dishOrder;
                    let priceOrder = ticket.priceOrder;
                    for (let i = 0; i < arrOrder.length; i++) {
                        dishOrder = dishOrder + arrOrder[i].count + ' ' + arrOrder[i].name + ', ';
                        priceOrder = priceOrder + arrOrder[i].count * arrOrder[i].price
                    }
                    let updateTicket = await db.Ticket.update({
                        dishOrder: dishOrder,
                        priceOrder: priceOrder
                    }, {
                        where: { id: ticket.id }
                    });

                    if (!updateTicket) {
                        resolve({
                            errCode: 2,
                            errMessage: 'Update the dish failed'
                        });
                    } else {
                        resolve({
                            errCode: 0,
                            errMessage: 'Update the dish success'
                        });
                    }
                }
            }

        } catch (error) {
            reject(error);
        }
    })
}


let deleteTicket = (idTicket) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!idTicket) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                })
            } else {
                let ticket = await db.Ticket.findOne({
                    where: {
                        id: idTicket,
                    }
                })

                if (!ticket) {
                    resolve({
                        errCode: 2,
                        errMessage: `The ticket isn't exit!`
                    })
                } else {
                    let transaction;
                    try {
                        transaction = await db.sequelize.transaction();
                        // Xóa các bản ghi liên quan từ bảng trung gian
                        await db.TicketTable.destroy({
                            where: { ticketId: idTicket },
                            transaction
                        });

                        // Sau đó xóa Ticket
                        await db.Ticket.destroy({
                            where: { id: idTicket },
                            transaction
                        });

                        await transaction.commit();
                        resolve({
                            errCode: 0,
                            errMessage: `Delete ticket success`
                        })

                    } catch (error) {
                        console.log(error);
                        // Rollback transaction nếu có lỗi
                        if (transaction) {
                            await transaction.rollback();
                        }
                        reject(error);
                    }
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}

let getDataCToChart = (inputYear) => {
    return new Promise(async (resolve, reject) => {
        try {
            let currentYear = new Date().getFullYear();
            if (inputYear) {
                currentYear = new Date(inputYear).getFullYear();
            }
            // let currentYear = new Date(1705597200000).getFullYear();
            // console.log(currentYear);
            // await db.Ticket.findAll({
            //     attributes: [
            //         [db.Sequelize.literal('MONTH(Ticket.createdAt)'), 'month'],
            //         [db.Sequelize.literal('YEAR(Ticket.createdAt)'), 'year'],
            //         [db.Sequelize.fn('SUM', db.Sequelize.col('bill')), 'total_price']
            //     ],
            //     where: {
            //         payStatus: true,
            //         [db.Sequelize.Op.and]: [
            //             db.Sequelize.literal('YEAR(Ticket.createdAt) =  :currentYear'),
            //         ],
            //     },
            //     group: [
            //         db.Sequelize.literal('MONTH(Ticket.createdAt)'),
            //         db.Sequelize.literal('YEAR(Ticket.createdAt)'),
            //     ],
            //     replacements: { currentYear },
            //     raw: true,
            //     nest: true
            // })
            await db.Ticket.findAll({
                attributes: [
                    [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')), 'month'],
                    [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')), 'year'],
                    // [db.Sequelize.fn('SUM', db.Sequelize.col('bill')), 'total_price'],
                    [
                        db.Sequelize.fn(
                            'SUM',
                            db.Sequelize.literal('("bill" + "priceOrder")')
                        ),
                        'total_price',
                    ],
                ],
                where: {
                    payStatus: true,
                    [db.Sequelize.Op.and]: [
                        db.Sequelize.literal('EXTRACT(YEAR FROM "createdAt") =  :currentYear'),
                    ],
                },
                group: [
                    db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')),
                    db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')),
                ],
                replacements: { currentYear },
                raw: true,
                nest: true
            })
                .then(results => {
                    resolve(results);
                })
                .catch(error => {
                    console.error('Error:', error);
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }


    });
}

module.exports = {
    createTicket, createTicketByCustomer, verifyTicket, verifyTicketCancle, getAllTicket, getSummaryTicket, deleteTicket, updateTicket, updateTicketOrder, getDataCToChart
}