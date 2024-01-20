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



let checkPimary = (arrDataSchedule) => {
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
                    return a.timeType === b.timeType && a.date === b.date;
                })

                resolve(arrNewDataSchedule);
            }
        } catch (error) {
            reject(error);
        }
    })
}

let saveNewSchedule = (arrDataSchedule) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!arrDataSchedule || arrDataSchedule < 0) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing inputs parameter !"
                })
            } else {
                // let arrDataScheduleNew = await checkPimary(arrDataSchedule);
                // Filter previously added ( timeTypes, date )
                if (arrDataSchedule && arrDataSchedule.length > 0) {
                    await db.Schedule.destroy({
                        where: {
                            date: new Date(arrDataSchedule[0].date),
                            idGroup: arrDataSchedule[0].idGroup
                        }
                    })
                        .then(async () => {
                            // console.log(`${deletedRows} rows deleted.`); // số lượng hàng đã xóa
                            // if (arrDataSchedule.length === 1) {
                            //     await db.Schedule.create(arrDataSchedule[0]);
                            // } else {
                            await arrDataSchedule.map(item => {
                                item.id = uuidv4();
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