import staffServices from '../services/staffServices';
import db from '../models/index';

let getTopStaffHome = async (req, res) => {
    let limit = req.query.limit;
    if (!limit) {
        limit = 10;
    }
    try {
        // setTimeout(async () => {
        let staff = await staffServices.getTopStaffHome(+limit); //dấu + để convert từ kiểu string sang nố nguyên
        return res.status(200).json(staff);
        // }, "10000");
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error from server..."
        })
    }

}

module.exports = {
    getTopStaffHome
}