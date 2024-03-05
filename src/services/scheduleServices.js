import db from '../models/index';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

let getSchedule = (dateInput, groupInput) => {
    return new Promise(async (resolve, reject) => {
        try {
            let dataSchedule = [];
            dataSchedule = await db.Schedule.findAll({
                where: {
                    date: new Date(dateInput),
                    idGroup: groupInput
                },
                attributes: ['id', 'date', 'timeType'],
                include: [
                    { model: db.Allcode, as: 'allCodeData', attributes: ['valueEn', 'valueVi'] },
                    { model: db.Group, as: 'groupData', attributes: ['id', 'nameGroup'] },
                ],
                raw: true,
                nest: true
            });


            //  lấy arr id Schedule của ngày hôm đó mà đã tồn tại trong bảng ticket
            // const today = new Date(dateInput);
            // today.setHours(0, 0, 0, 0);

            // const tomorrow = new Date(today);
            // tomorrow.setDate(today.getDate() + 1);
            // const arrIdScheduleOfTicketToday = await db.Ticket.findAll({
            //     attributes: ['idSchedule'],
            //     include: [
            //         { model: db.Schedule, as: 'scheduleData', attributes: ['date', 'idGroup'] },
            //     ],
            //     where: {
            //         '$scheduleData.date$': {
            //             [Op.between]: [today, tomorrow],
            //         },
            //         '$scheduleData.idGroup$': groupInput
            //     },
            //     raw: true,
            //     nest: true
            // })


            // for (let i = 0; i < arrIdScheduleOfTicketToday.length; i++) {
            //     dataSchedule.map(item => {
            //         if (item.id === arrIdScheduleOfTicketToday[i].idSchedule) {
            //             item.noDelete = true
            //         }
            //     })
            // }
            // console.log("Vé của ngày hôm nay và group Này: ", arrIdScheduleOfTicketToday);
            // console.log("Lịch hôm nay: ", dataSchedule);
            resolve(dataSchedule);
        } catch (error) {
            reject(error);
        }
    });
}




let getSchedule2 = (dateInput) => {
    return new Promise(async (resolve, reject) => {
        try {
            let dataSchedule = [];
            dataSchedule = await db.Schedule.findAll({
                where: {
                    date: new Date(dateInput)
                },
                attributes: [
                    [db.Sequelize.literal('DISTINCT ON ("timeType") "timeType"'), 'timeType']
                ],
                include: [
                    { model: db.Allcode, as: 'allCodeData', attributes: ['valueEn', 'valueVi'] },
                    { model: db.Group, as: 'groupData', attributes: ['id', 'nameGroup'] },
                ],
                order: [
                    [db.sequelize.literal('"timeType"'), 'ASC'], // Sắp xếp theo timeType
                ],
                group: ['timeType', 'allCodeData.valueEn', 'allCodeData.valueVi', 'groupData.id', 'groupData.nameGroup'],
                raw: true,
                nest: true
            });


            dataSchedule = await dataSchedule.sort((a, b) => {
                // Chuyển đổi "T1", "T2", ..., "T20" thành số để sắp xếp
                const numA = parseInt(a.timeType.slice(1));
                const numB = parseInt(b.timeType.slice(1));

                return numA - numB;
            });

            resolve(dataSchedule);
        } catch (error) {
            reject(error);
        }
    });
}



let checkScheduleNew = (arrDataSchedule) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (arrDataSchedule && arrDataSchedule.length > 0) {
                // get all schedule in database
                let dataExist = await db.Schedule.findAll({
                    where: {
                        date: new Date(arrDataSchedule[0].date),
                        idGroup: arrDataSchedule[0].idGroup
                    }
                });

                // convert date dataExist
                dataExist = dataExist.map(item => {
                    item.date = new Date(item.date).getTime();
                    return item;
                })

                // compare difference to filter previously addded ( timeTypes, date )
                let arrNewDataSchedule = _.differenceWith(arrDataSchedule, dataExist, (a, b) => {
                    return a.timeType === b.timeType && a.date === b.date && a.idGroup === b.idGroup
                })

                resolve(arrNewDataSchedule);
            }
        } catch (error) {
            reject(error);
        }
    })
}


let getLostSchedules = (arrDataSchedule) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (arrDataSchedule && arrDataSchedule.length > 0) {
                // get all schedule in database
                let dataExist = await db.Schedule.findAll({
                    where: {
                        date: new Date(arrDataSchedule[0].date),
                        idGroup: arrDataSchedule[0].idGroup
                    }
                });

                // convert date dataExist
                dataExist = dataExist.map(item => {
                    item.date = new Date(item.date).getTime();
                    return item;
                })

                // compare difference to filter previously addded ( timeTypes, date, idGroup )
                let arrLostSchedule = _.differenceWith(dataExist, arrDataSchedule, (a, b) => {
                    return a.timeType === b.timeType && a.date === b.date && a.idGroup === b.idGroup
                })

                resolve(arrLostSchedule);
            }
        } catch (error) {
            reject(error);
        }
    })
}

let saveNewSchedule = (arrDataSchedule) => {
    return new Promise(async (resolve, reject) => {
        // console.log(arrDataSchedule);
        // let newArr = await checkScheduleNew(arrDataSchedule);
        // console.log(newArr);
        try {

            if (arrDataSchedule && arrDataSchedule.length > 0) {

                const date = new Date(arrDataSchedule[0].date);


                var day = date.getDate();
                var month = date.getMonth() + 1; // Lưu ý: Tháng bắt đầu từ 0 nên cần cộng thêm 1
                var year = date.getFullYear();

                // Định dạng lại ngày, tháng, năm theo định dạng mong muốn (dd/MM/YYYY)
                var formattedDate = (day < 10 ? '0' : '') + day + '/' + (month < 10 ? '0' : '') + month + '/' + year;


                // Bắt đầu kiểm tra xem schedule đã xóa đi có tồn tại trong bảng Ticket không,
                const today = new Date(arrDataSchedule[0].date);
                today.setUTCHours(0, 0, 0, 0);

                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                const arrScheduleOfTicketToday = await db.Ticket.findAll({
                    attributes: ['idSchedule'],
                    include: [
                        { model: db.Schedule, as: 'scheduleData', attributes: ['date', 'timeType', 'idGroup'] },
                    ],
                    where: {
                        '$scheduleData.date$': {
                            [Op.between]: [today, tomorrow],
                        },
                        '$scheduleData.idGroup$': arrDataSchedule[0].idGroup
                    },
                    raw: true,
                    nest: true
                })

                for (let s = 0; s < arrScheduleOfTicketToday.length; s++) {
                    arrDataSchedule.map(item => {
                        if (
                            (arrScheduleOfTicketToday[s].scheduleData.date).getTime() === (new Date(item.date)).getTime() &&
                            arrScheduleOfTicketToday[s].scheduleData.timeType === item.timeType &&
                            arrScheduleOfTicketToday[s].scheduleData.idGroup === item.idGroup
                        ) {
                            item.id = arrScheduleOfTicketToday[s].idSchedule
                            return item
                        }
                    })
                }

                let arrIdInTicket = await arrScheduleOfTicketToday.map(item => { return item.idSchedule });
                let arrLostSchedule = await getLostSchedules(arrDataSchedule);
                let arrIdLostSchedule = await arrLostSchedule.map(item => { return item.id })
                // Kiểm tra xem schedule đã xóa đi có tồn tại trong bảng Ticket không,
                // Nếu có thì báo lỗi
                // console.log("id hôm nay có trong ticket: ", arrIdInTicket);
                // console.log("id bị xóa hôm nay: ", arrIdLostSchedule);

                const isAnyElementInB = arrIdLostSchedule.some(valueB => arrIdInTicket.includes(valueB));

                if (isAnyElementInB) {
                    // "Ít nhất một giá trị của B tồn tại trong A");
                    resolve({
                        errCode: 2,
                        errMessage: formattedDate
                    })
                } else {
                    // "Không có giá trị nào của B tồn tại trong A");
                    // Lúc này mới được phép cập nhật
                    await db.Schedule.destroy({
                        where: {
                            date: new Date(arrDataSchedule[0].date),
                            idGroup: arrDataSchedule[0].idGroup
                        }
                    })
                        .then(async () => {
                            await arrDataSchedule.map(item => {
                                if (!item.id) {
                                    item.id = uuidv4();
                                    // tránh trường hợp id của lịch bị thay đổi
                                    // làm cho vé có idSchedule này bị lỗi
                                }
                                return arrDataSchedule
                            })
                            await db.Schedule.bulkCreate(
                                arrDataSchedule,
                                { individualHooks: true } // giúp thằng bulkCreate không bỏ qua trường id
                            );

                            // }
                            resolve({
                                errCode: 0,
                                errMessage: "Create new schedule succeeds !"
                            })
                        })
                        .catch((error) => {
                            reject(error);
                        });
                }
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Missing inputs parameter !",
                });
            }

        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    getSchedule, getSchedule2, saveNewSchedule
}