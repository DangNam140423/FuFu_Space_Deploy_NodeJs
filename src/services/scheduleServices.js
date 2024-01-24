import db from '../models/index';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

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
            // dataSchedule = await db.Schedule.findAll({
            //     where: {
            //         date: new Date(dateInput)
            //     },
            //     attributes: ['id', 'date', 'timeType'],
            //     include: [
            //         { model: db.Allcode, as: 'allCodeData', attributes: ['valueEn', 'valueVi'] },
            //         { model: db.Group, as: 'groupData', attributes: ['id', 'nameGroup'] },
            //     ],
            //     raw: true,
            //     nest: true
            // });


            dataSchedule = await db.Schedule.findAll({
                where: {
                    date: new Date(dateInput)
                },
                attributes: [
                    [db.Sequelize.literal('DISTINCT ON ("timeType") "timeType"'), 'timeType'],

                    // [Sequelize.fn('MAX', db.Sequelize.col('timeType')), 'timeType'],
                ],
                include: [
                    { model: db.Allcode, as: 'allCodeData', attributes: ['valueEn', 'valueVi'] },
                    { model: db.Group, as: 'groupData', attributes: ['id', 'nameGroup'] },
                ],
                group: ['timeType', 'allCodeData.valueEn', 'allCodeData.valueVi', 'groupData.id', 'groupData.nameGroup'],
                raw: true,
                nest: true
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


let checkTicketOfSchedule = (arrDataSchedule) => {

}

let saveNewSchedule = (arrDataSchedule) => {
    return new Promise(async (resolve, reject) => {
        // console.log(arrDataSchedule);
        // let newArr = await checkScheduleNew(arrDataSchedule);
        // console.log(newArr);
        try {
            if (!arrDataSchedule || arrDataSchedule < 0) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing inputs parameter !"
                })
            } else {
                if (arrDataSchedule && arrDataSchedule.length > 0) {
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
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: "arrDataSchedule is empty.",
                    });
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    getSchedule, getSchedule2, saveNewSchedule
}