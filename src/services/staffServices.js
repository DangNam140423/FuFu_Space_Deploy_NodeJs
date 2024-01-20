import db from '../models/index';

let getTopStaffHome = (limit) => {
    return new Promise(async (resolve, reject) => {
        try {
            let staff = await db.User.findAll({
                where: { roleId: 'R2' },
                limit: limit,
                order: [
                    ['createdAt', 'DESC']
                ],
                attributes: {
                    exclude: ['password']
                },
                include: [
                    { model: db.Allcode, as: 'roleData', attributes: ['valueEn', 'valueVi'] },
                    { model: db.Allcode, as: 'genderData', attributes: ['valueEn', 'valueVi'] },
                ],
                raw: true,
                nest: true
            })
            resolve({
                errCode: 0,
                errMessage: "Ok",
                data: staff,
            });
        } catch (error) {
            reject(error);
        }
    })
}

module.exports = {
    getTopStaffHome
}