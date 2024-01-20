import scheduleServices from '../services/scheduleServices';

let handleGetSchedule = async (req, res) => {
    try {
        let dataSchedule = await scheduleServices.getSchedule(req.body.date, req.body.idGroup);
        if (dataSchedule) {
            return res.status(200).json({
                errCode: 0,
                dataSchedule
            });
        } else {
            return res.status(200).json({
                errCode: 1,
                errMessage: "Data Schedule don't exist"
            });
        }
    } catch (e) {
        console.log(e);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}


let handleGetSchedule2 = async (req, res) => {
    try {
        let dataSchedule = await scheduleServices.getSchedule2(req.body.date);
        if (dataSchedule) {
            return res.status(200).json({
                errCode: 0,
                dataSchedule
            });
        } else {
            return res.status(200).json({
                errCode: 1,
                errMessage: "Data Schedule don't exist"
            });
        }
    } catch (e) {
        console.log(e);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}

let handleSaveNewSchedule = async (req, res) => {
    try {
        let arrDataSchedule = req.body;
        let result = await scheduleServices.saveNewSchedule(arrDataSchedule);
        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}



module.exports = {
    handleGetSchedule, handleGetSchedule2, handleSaveNewSchedule
}
