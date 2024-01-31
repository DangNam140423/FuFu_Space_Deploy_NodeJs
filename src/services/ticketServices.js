import db from '../models/index';
require('dotenv').config();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;




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
                            db.sequelize.literal(`CAST("Ticket"."id" AS TEXT) = '${dataInput.dataSearch}'`),
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
                    tableString = tableString + ' - ' + groupTable + item.Tables.maxPeople
                })
                ticket[i].tableString = tableString;
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
                ],
                include: [
                    { model: db.Schedule, as: 'scheduleData', attributes: ['date'] },
                ],
                where: {
                    '$scheduleData.date$': {
                        [Op.between]: [today, tomorrow],
                    },
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



let createTicket = (dataTicket) => {
    return new Promise(async (resolve, reject) => {
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
                            [db.Sequelize.Op.or]: ['R1', 'R2']
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
                    if (numberKid > 0) {
                        ticketType = ticketType + numberKid + " vé trẻ em, "
                    }
                    if (numberAdultBest > 0) {
                        ticketType = ticketType + numberAdultBest + " vé người lớn ( ưu đãi ), "
                    }
                    if (numberKidBest > 0) {
                        ticketType = ticketType + numberKidBest + " vé trẻ em ( ưu đãi ), "
                    }
                    if (numberDiscount > 0) {
                        ticketType = ticketType + numberDiscount + " vé discount"
                    }


                    let ticket = await db.Ticket.create({
                        idSchedule: arrSchedule.id,
                        phoneCustomer: dataTicket.phoneCustomer,
                        nameCustomer: dataTicket.nameCustomer,
                        numberPeople: numberPeople,
                        ticketType: ticketType,
                        idStaff: dataTicket.idStaff,
                        bill: price,
                        payStatus: true
                    })

                    // Liên kết Ticket với các bản ghi Table thông qua mô hình trung gian TicketTable
                    if (ticket) {
                        await ticket.addTables(dataTicket.arrIdTable);
                        resolve({
                            errCode: 0,
                            errMessage: "Create a new ticket success",
                        });
                    } else {
                        resolve({
                            errCode: 3,
                            errMessage: "Ticket is undefined.",
                        });
                    }
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}

let updateTicket = (dataTicket) => {
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
                let updateTicket = await db.Ticket.update({
                    payStatus: true
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

        } catch (error) {
            reject(error);
        }
    })
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
                    if (ticket.payStatus === true) {
                        resolve({
                            errCode: 3,
                            errMessage: `This ticket paied. Can't delete`
                        })
                    } else {
                        // Xóa các bản ghi liên quan từ bảng trung gian
                        await db.TicketTable.destroy({
                            where: { ticketId: idTicket }
                        }).then(async () => {
                            // // Sau đó xóa Ticket
                            await db.Ticket.destroy({
                                where: { id: idTicket }
                            });
                            resolve({
                                errCode: 0,
                                errMessage: `Delete ticket success`
                            })
                        })
                            .catch((error) => {
                                reject(error);
                            });


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
    createTicket, getAllTicket, getSummaryTicket, deleteTicket, updateTicket, updateTicketOrder, getDataCToChart
}