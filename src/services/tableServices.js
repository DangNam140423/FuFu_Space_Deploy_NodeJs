import db from '../models/index';



let getAllTable = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let table = [];
            table = await db.Table.findAll();
            resolve(table);
        } catch (error) {
            reject(error);
        }
    });
}



let createTable = (dataTable) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!dataTable || !dataTable.tableNumber || !dataTable.maxPeople) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                });
            } else {
                let table = await db.Table.create({
                    tableNumber: dataTable.tableNumber,
                    maxPeople: dataTable.maxPeople,
                })
                resolve({
                    errCode: 0,
                    errMessage: "Create a new table success",
                    data: table,
                });
            }
            // let arrTable = [];
            // for (let i = 1; i <= 33; i++) {
            //     let object = {};
            //     object.id = i;
            //     object.tableNumber = i;
            //     object.maxPeople = 2;
            //     if (i <= 3) {
            //         object.idGroup = 1
            //     } else if (i > 3 && i <= 9) {
            //         object.idGroup = 2
            //     } else if (i > 9 && i <= 13) {
            //         object.idGroup = 3
            //     } else if (i > 13 && i <= 16) {
            //         object.idGroup = 4
            //     } else if (i > 16 && i <= 22) {
            //         object.idGroup = 5
            //     } else if (i > 22 && i <= 30) {
            //         object.idGroup = 6
            //     } else if (i > 30 && i <= 33) {
            //         object.idGroup = 7
            //     }
            //     arrTable.push(object);
            // }
            // let table = await db.Table.bulkCreate(arrTable);
            // resolve({
            //     errCode: 0,
            //     errMessage: "Create a new table success",
            //     data: table,
            // });
        } catch (error) {
            reject(error);
        }
    })
}




let updateTable = (arrDataTable) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!arrDataTable) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing inputs parameter !"
                })
            } else {
                if (arrDataTable && arrDataTable.length > 0) {

                    await db.Table.update(arrDataTable, {
                        where: {}
                    })
                    resolve({
                        errCode: 0,
                        errMessage: "Update table succeeds !"
                    })
                    // .then(async (deletedRows) => {
                    //     // console.log(`${deletedRows} rows deleted.`); // xóa lượng hàng đã xóa
                    //     await db.Table.bulkCreate(arrDataTable);
                    //     resolve({
                    //         errCode: 0,
                    //         errMessage: "Update table succeeds !"
                    //     })
                    // })
                    // .catch((error) => {
                    //     reject(error);
                    // });
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}




let deleteTable = (idTable) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!idTable) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                })
            } else {
                let table = await db.Table.findOne({
                    where: { id: idTable }
                })

                if (!table) {
                    resolve({
                        errCode: 2,
                        errMessage: `The table isn't exit!`
                    })
                } else {
                    await db.Table.destroy({
                        where: {
                            id: idTable
                        }
                    });
                    resolve({
                        errCode: 0,
                        errMessage: `Delete the table success`
                    })
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}



let getTableEmptyBySchedule = (dataSchedule) => {
    // dataSchedule ( date, timeType)
    return new Promise(async (resolve, reject) => {
        try {

            let arrSchedule = await db.Schedule.findAll({
                where: {
                    date: new Date(dataSchedule.date),
                    timeType: dataSchedule.timeType
                }
            })

            // arrSchedule (id, date, timeType, idGroup)
            let arr_ticket_booked = [];
            for (let i = 0; i < arrSchedule.length; i++) {
                let ticket_booked = await db.Ticket.findAll({
                    where: { idSchedule: arrSchedule[i].id },
                    include: [
                        { model: db.Table, attributes: ['id'] },
                    ],
                    raw: true,
                    nest: true
                })
                if (ticket_booked && ticket_booked.length > 0) {
                    ticket_booked.map(item => {
                        arr_ticket_booked.push(item);
                    })
                }
            }

            let arrIdGroup = arrSchedule.map(item => {
                return item.idGroup
            })

            let table = await db.Table.findAll({
                where: { idGroup: arrIdGroup }
            });

            if (arr_ticket_booked && arr_ticket_booked.length > 0) {
                // nếu tồn tại vé theo idSchedule
                for (let i = 0; i < arr_ticket_booked.length; i++) {
                    table.map((item) => {
                        if (item.status === true) {
                            // chỉ xử lý bàn đang hoạt động
                            if (item.id === arr_ticket_booked[i].Tables.id) {
                                item.isEmpty = false;
                            }
                        }
                    })
                }
            }


            // if (schedule) {
            //     // nếu lịch này tồn tại
            //     table = await db.Table.findAll();

            //     let ticket_booked = await db.Ticket.findAll({
            //         where: { idSchedule: idSchedule },
            //         include: [
            //             { model: db.Table, attributes: ['id'] },
            //         ],
            //         raw: true,
            //         nest: true
            //     })
            //     if (ticket_booked && ticket_booked.length > 0) {
            //         // nếu tồn tại vé theo idSchedule
            //         for (let i = 0; i < ticket_booked.length; i++) {
            //             table.map((item) => {
            //                 if (item.status === 1) {
            //                     // chỉ xử lý bàn đang hoạt động
            //                     if (item.id === ticket_booked[i].Tables.id) {
            //                         item.isEmpty = 0;
            //                     }
            //                 }
            //             })
            //         }
            //     }
            // }

            resolve(table);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    createTable, updateTable, deleteTable, getAllTable, getTableEmptyBySchedule
}