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
        let dataSchedule = await scheduleServices.getSchedule2(req.body);
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

let handleSaveNewSchedule = async (req, res, io) => {
    try {
        let arrDataSchedule = req.body.arrDataSchedule;
        let numberDateToSave = req.body.numberDateToSave;

        let arrDate = [arrDataSchedule];

        for (let next = 1; next < numberDateToSave; next++) {
            let arrDataScheduleNext = [];
            for (let i = 0; i < arrDataSchedule.length; i++) {
                var date = new Date(arrDataSchedule[i].date);
                date.setDate(date.getDate() + next);
                var tomorrowTimestamp = new Date(date).getTime();
                var object = {}
                object.id = ''
                object.date = tomorrowTimestamp
                object.timeType = arrDataSchedule[i].timeType
                object.idGroup = arrDataSchedule[i].idGroup

                arrDataScheduleNext.push(object);
            }

            arrDate.push(arrDataScheduleNext)
        }


        let arrResult = [];
        for (let j = 0; j < arrDate.length; j++) {
            let result = await scheduleServices.saveNewSchedule(arrDate[j]);
            arrResult.push(result);
        }

        let newSchedule = "";

        var hasError = arrResult.filter(function (item) {
            return item.errCode !== 0;
        });

        if (hasError && hasError.length > 0) {
            let errMessage = '';
            hasError.map(item => {
                errMessage = errMessage + item.errMessage + ', '
            })
            if (hasError.length === arrResult.length) {
                errMessage = ('Không thể sửa khung giờ vào ngày: \n'
                    + errMessage
                    + '\n Vì có khung giờ mà khách đã mua vé. Hãy kiểm tra lại các ngày đó')
            } else {
                io.emit('newSchedule', newSchedule);

                errMessage = ('Lưu thành công, NHƯNG không thể sửa khung giờ vào ngày: \n'
                    + errMessage
                    + '\n Vì có khung giờ mà khách đã mua vé. Hãy kiểm tra lại các ngày đó')
            }

            return res.status(200).json({
                errCode: 2,
                errMessage: errMessage
            });
        } else {
            io.emit('newSchedule', newSchedule);

            return res.status(200).json({
                errCode: 0,
                errMessage: 'Create new schedule succeeds !'
            });
        }

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
