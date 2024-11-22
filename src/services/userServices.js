require('dotenv').config();
import db from '../models/index';
import bcrypt from 'bcryptjs';
import sendMailServices from './sendMailServices';
import { v4 as uuidv4 } from 'uuid';
import { getGroupWithRoles } from './jwtServices'
import { createJWT, verifyToken } from '../middleware/jwtAction'

const salt = bcrypt.genSaltSync(10);

let hanleUserLogin = (email, password) => {
    return new Promise(async (resolve, reject) => {
        try {
            let userData = {};
            let isExit = await checkUserEmail(email);
            if (isExit) {
                let user = await db.User.findOne({
                    where: { email: email, status: true },
                    // just take email, roleId and password
                    attributes: ['id', 'email', 'roleId', 'password', 'fullName', 'status', 'image'],
                    raw: true
                });
                if (user) {
                    if (user.status === true) {
                        // compare password
                        let check = bcrypt.compareSync(password, user.password);
                        if (check) {
                            userData.errCode = 0;
                            userData.errMessage = `OKK`;
                            // delete password, just take email and roleId
                            delete user.password;
                            userData.user = await user;

                            // create jwt from user
                            let jwtData = await createJWT({
                                id: user.id,
                                email: user.email,
                                fullName: user.fullName,
                                roleId: user.roleId,
                                status: user.status,
                            });

                            userData.jwtData = jwtData
                        } else {
                            userData.errCode = 3;
                            userData.errMessage = 'Wrong password'
                        }
                    } else {
                        userData.errCode = 4;
                        userData.errMessage = 'Account has not been activated'
                    }
                } else {
                    userData.errCode = 2;
                    userData.errMessage = `User's not found `
                }
            } else {
                userData.errCode = 1;
                userData.errMessage = `Your's Email isn't exits in your system. Please try orther email `
            }
            resolve(userData)
        } catch (error) {
            reject(error);
        }
    })
}


let checkUserEmail = (userEmail) => {
    return new Promise(async (resolve, reject) => {
        try {
            let user = await db.User.findOne({
                where: { email: userEmail, status: true }
            });
            if (user) {
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (error) {
            reject(error);
        }
    })
}

let getAllUsers = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let users = [];
            if (userId == 'ALL') {
                users = await db.User.findAll({
                    where: { status: true },
                    attributes: {
                        exclude: ['password']
                    },
                    // order: [
                    //     ['id', 'DESC'],
                    // ]
                })
            }
            if (userId && userId !== 'ALL') {
                users = await db.User.findOne({
                    where: { id: +userId, status: true }, //dấu + để convert từ kiểu string sang nố nguyên
                    attributes: {
                        exclude: ['password'],
                    }
                })
            }
            resolve([users]);
        } catch (error) {
            reject(error);
        }
    });
}


let getUserWithPagination = (userId, page, limit) => {
    return new Promise(async (resolve, reject) => {
        try {
            let offset = (page - 1) * limit;
            let countdataUser = 0;
            let dataUser = {};

            if (userId == 'ALL') {
                let { count, rows } = await db.User.findAndCountAll({
                    where: { status: true },
                    attributes: {
                        exclude: ['password']
                    },
                    offset: offset,
                    limit: limit,
                })
                countdataUser = count;
                dataUser = rows;
            }
            if (userId && userId !== 'ALL') {
                let { count, rows } = await db.User.findAndCountAll({
                    where: { id: +userId, status: true }, //dấu + để convert từ kiểu string sang nố nguyên
                    attributes: {
                        exclude: ['password']
                    },
                    offset: offset,
                    limit: limit,
                })
                countdataUser = count;
                dataUser = rows;
            }

            let totalPages = Math.ceil(countdataUser / limit);
            let data = {
                totalRows: countdataUser,
                totalPages: totalPages,
                dataUser: dataUser
            }
            resolve(data);
        } catch (error) {
            reject(error);
        }
    })
}


let hashUserPassword = (password) => {
    return new Promise(async (resolve, reject) => {
        try {
            var hashPassword = await bcrypt.hashSync(password, salt);
            resolve(hashPassword);
        } catch (error) {
            reject(error);
        }
    });
}

let buildUrlEmail = (userData, token) => {
    let result = `${process.env.URL_REACT}/verify-user?token=${token}&userId=${userData.id}`;

    return result
}

let createNewUser = async (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email.trim() || !data.password.trim() ||
                !data.fullname.trim() || !data.address.trim() ||
                !data.phonenumber || !data.gender ||
                !data.roleid || !data.avatar
            ) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter'
                });
            } else {
                // check email is exit ?
                let check = await checkUserEmail(data.email);
                if (check === true) {
                    resolve({
                        errCode: 2,
                        errMessage: 'This email is already in use !'
                    })
                } else {
                    let hashPasswordFromBcrypt = await hashUserPassword(data.password);
                    let createUser = await db.User.create({
                        fullName: data.fullname,
                        email: data.email,
                        password: hashPasswordFromBcrypt,
                        address: data.address,
                        gender: data.gender,
                        phone: data.phonenumber,
                        roleId: data.roleid,
                        image: data.avatar,
                        status: false
                    });

                    if (createUser) {
                        let users = await db.User.findOne({
                            where: { email: data.email }
                        })

                        let token = uuidv4();

                        await sendMailServices.handleSendMailAuth({
                            dataUser: users,
                            redirectLink: buildUrlEmail(users, token),
                        });

                        createUser.set({
                            token: token
                        });
                        await createUser.save();

                        resolve({
                            errCode: 0,
                            errMessage: 'Create a new user success'
                        });
                    } else {
                        resolve({
                            errCode: 3,
                            errMessage: 'New user creation failed'
                        });
                    }
                }
            }

        } catch (error) {
            reject(error);
        }
    });
}

let veriFyUser = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.userId || !data.token) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter'
                })
            } else {
                let user = await db.User.findOne({
                    where: {
                        id: data.userId,
                        token: data.token,
                        status: false
                    }
                })

                if (user) {
                    await db.User.update({
                        status: true
                    }, {
                        where: { id: user.id }
                    });
                    resolve({
                        errCode: 0,
                        errMessage: `Update the user succeeds`
                    });
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: `The account has been activated or does not exist`
                    });
                }
            }
        } catch (error) {
            reject(error);
        }
    })
}

let deleteUser = (idUser) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!idUser) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                })
            } else {
                let user = await db.User.findOne({
                    where: { id: idUser }
                })

                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage: `The user isn't exit!`
                    })
                } else {
                    if (user.roleId === 'R0') {
                        resolve({
                            errCode: 3,
                            errMessage: `Bố mày là Boss`
                        })
                    } else {
                        await db.User.update(
                            { status: false },
                            {
                                where: { id: idUser, status: true },
                            },
                        );
                        resolve({
                            errCode: 0,
                            errMessage: `The user is delete`
                        })
                    }
                }
            }

        } catch (error) {
            reject(error);
        }
    })
}

let editUser = (dataUser) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!dataUser.id || !dataUser.fullname.trim() ||
                !dataUser.address.trim() || !dataUser.phonenumber ||
                !dataUser.gender || !dataUser.roleid
            ) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !'
                })
            } else {
                let user = await db.User.findOne({
                    where: { id: dataUser.id }
                })
                if (user) {
                    let updateUser = await db.User.update({
                        fullName: dataUser.fullname,
                        address: dataUser.address,
                        gender: dataUser.gender,
                        phone: dataUser.phonenumber,
                        roleId: dataUser.roleid
                    }, {
                        where: { id: user.id }
                    });
                    if (dataUser.avatar && updateUser) {
                        await db.User.update({
                            image: dataUser.avatar
                        }, {
                            where: { id: user.id }
                        });
                    }
                    resolve({
                        errCode: 0,
                        errMessage: `Update the user succeeds`
                    });
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: `User not found`
                    });

                }
            }

        } catch (error) {
            reject(error);
        }
    })
}

module.exports = {
    hanleUserLogin, getAllUsers, getUserWithPagination, createNewUser, deleteUser, editUser, veriFyUser
}