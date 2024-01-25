import db from '../models/index';
const Sequelize = require('sequelize');
const Op = Sequelize.Op;


let getAllMenu = (categoryInput) => {
    return new Promise(async (resolve, reject) => {
        try {
            let menus = [];
            if (categoryInput == 'ALL') {
                menus = await db.Menu.findAll({
                    attributes: {
                        exclude: ['image']
                    },
                    order: [
                        ['category', 'DESC'],
                        ['name', 'ASC']
                    ],
                });
                // menus = ['all']
            }
            if (categoryInput && categoryInput !== 'ALL') {
                menus = await db.Menu.findAll({
                    attributes: {
                        exclude: ['image']
                    },
                    order: [
                        ['name', 'ASC']
                    ],
                    where: { category: categoryInput },
                });
                // menus = ['1', '2']
            }
            resolve(menus);
        } catch (error) {
            reject(error);
        }
    })
}

let getMenuWithPagination = (categoryInput, page, limit) => {
    return new Promise(async (resolve, reject) => {
        try {
            let offset = (page - 1) * limit;
            let countdataMenu = 0;
            let dataMenu = {};
            if (categoryInput === 'ALL') {
                let { count, rows } = await db.Menu.findAndCountAll({
                    attributes: {
                        exclude: ['image']
                    },
                    order: [
                        ['category', 'DESC'],
                        ['name', 'ASC']
                    ],
                    offset: offset,
                    limit: limit,
                })
                countdataMenu = count;
                dataMenu = rows;
            }
            if (categoryInput && categoryInput !== 'ALL') {
                let { count, rows } = await db.Menu.findAndCountAll({
                    attributes: {
                        exclude: ['image']
                    },
                    order: [
                        ['name', 'ASC']
                    ],
                    where: { category: categoryInput },
                    offset: offset,
                    limit: limit,
                })
                countdataMenu = count;
                dataMenu = rows;
            }

            let totalPages = Math.ceil(countdataMenu / limit);
            let data = {
                totalRows: countdataMenu,
                totalPages: totalPages,
                dataMenu: dataMenu
            }
            resolve(data);
        } catch (error) {
            reject(error);
        }
    })
}

let checkNameDish = (name) => {
    return new Promise(async (resolve, reject) => {
        try {
            let dish = await db.Menu.findOne({
                where: { name: name }
            });
            if (dish) {
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (error) {
            reject(error);
        }
    })
}

let checkNameDish_2 = (category, name, id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let dish = await db.Menu.findOne({
                where: {
                    name: name,
                    category: category,
                    id: {
                        [Op.ne]: id
                    }
                    // cùng tên nhưng khác id
                }
            });
            if (dish) {
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (error) {
            reject(error);
        }
    })
}

let createNewDish = (dataDish) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!dataDish.name.trim() || !dataDish.category ||
                typeof dataDish.many_sizes !== 'boolean' ||
                !dataDish.price_L
                // || !dataDish.image
            ) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                });
            } else {
                //check name dish
                let check = await checkNameDish(dataDish.name);
                if (check === true) {
                    resolve({
                        errCode: 2,
                        errMessage: 'This dish name is exist !'
                    })
                } else {
                    let createDish = await db.Menu.create({
                        name: dataDish.name,
                        many_sizes: dataDish.many_sizes,
                        price_S: dataDish.price_S,
                        price_M: dataDish.price_M,
                        price_L: dataDish.price_L,
                        category: dataDish.category,
                        // category cần kiểm tra chính xác nó có tồn tại trong bảng allcodes hay không 
                        // để đảm bảo tính nhất quán của dữ liệu
                        description: dataDish.description,
                        // image: dataDish.image,
                    });

                    if (createDish) {
                        resolve({
                            errCode: 0,
                            errMessage: 'Create a new dish success'
                        });
                    } else {
                        resolve({
                            errCode: 3,
                            errMessage: 'Create a new dish failed'
                        });
                    }
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}

let editDish = (dataDish) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!dataDish.id || !dataDish.name.trim() || !dataDish.category || typeof dataDish.many_sizes !== 'boolean' || !dataDish.price_L) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                })
            } else {
                let dish = await db.Menu.findOne({
                    where: { id: dataDish.id }
                })
                if (!dish) {
                    resolve({
                        errCode: 2,
                        errMessage: `Dish not found`
                    });
                } else {
                    let check = await checkNameDish_2(dataDish.category, dataDish.name, dataDish.id);
                    if (check === true) {
                        resolve({
                            errCode: 3,
                            errMessage: 'This dish name is exist !'
                        })
                    } else {
                        let updateDish = await db.Menu.update({
                            name: dataDish.name,
                            many_sizes: dataDish.many_sizes,
                            price_S: dataDish.price_S,
                            price_M: dataDish.price_M,
                            price_L: dataDish.price_L,
                            category: dataDish.category,
                            description: dataDish.description
                        }, {
                            where: { id: dish.id }
                        });

                        // if (dataDish.image && updateDish) {
                        //     await db.Menu.update({
                        //         image: dataDish.image
                        //     }, {
                        //         where: { id: dish.id }
                        //     });
                        // }
                        if (!updateDish) {
                            resolve({
                                errCode: 4,
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
            }
        } catch (error) {
            reject(error);
        }
    })
}

let deleteDish = (idDish) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!idDish) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                })
            } else {
                let dish = await db.Menu.findOne({
                    where: { id: idDish }
                })

                if (!dish) {
                    resolve({
                        errCode: 2,
                        errMessage: `The dish isn't exit!`
                    })
                } else {
                    await db.Menu.destroy({
                        where: {
                            id: idDish
                        }
                    });
                    resolve({
                        errCode: 0,
                        errMessage: `Delete the dish success`
                    })
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}

module.exports = {
    getAllMenu, getMenuWithPagination, createNewDish, editDish, deleteDish
}