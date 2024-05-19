import ticketServices from '../services/ticketServices';

let handleGetAllTicket = async (req, res) => {
    try {
        let dataTicket = await ticketServices.getAllTicket(req.body);
        let summaryTicket = await ticketServices.getSummaryTicket(req.body.date);
        if (dataTicket) {
            return res.status(200).json({
                errCode: 0,
                errMessage: "Get all ticket success",
                dataTicket,
                summaryTicket
            });
        } else {
            return res.status(200).json({
                errCode: 1,
                errMessage: "Data ticket don't exist"
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

let handleCreateNewTicket = async (req, res) => {
    try {
        let dataTicket = req.body;
        let ticket;
        if (dataTicket.idStaff === 0 && 'email' in dataTicket && 'imageBill' in dataTicket) {
            ticket = await ticketServices.createTicketByCustomer(dataTicket);
        } else {
            ticket = await ticketServices.createTicket(dataTicket);
        }
        return res.status(200).json(ticket);
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error from server..."
        })
    }

}

let handleVerifyTicket = async (req, res) => {
    try {
        let info;
        if ('cancle' in req.body) {
            info = await ticketServices.verifyTicketCancle(req.body);
        } else {
            info = await ticketServices.verifyTicket(req.body);
        }
        return res.status(200).json(
            info
        )
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            errCode: -1,
            errMessage: 'Error from the Server'
        })
    }
}

let handleUpdateTicket = async (req, res) => {
    try {
        let dataTicket = req.body.dataTicket;
        let arrOrder = req.body.arrOrder;
        let message = '';
        const infoUser = req.user;
        if (arrOrder.length > 0) {
            message = await ticketServices.updateTicketOrder(dataTicket, arrOrder);
        } else {
            message = await ticketServices.updateTicket(dataTicket, infoUser);
        }
        return res.status(200).json(
            message
        )
    } catch (e) {
        console.log(e);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}

let handleDeleteTicket = async (req, res) => {
    try {
        let message = await ticketServices.deleteTicket(req.body.id);
        return res.status(200).json(
            message
        );
    } catch (e) {
        console.log(e);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}


let handleSendThanksMail = async (req, res) => {
    try {
        let info = await ticketServices.sendThanksMail(req.body.arrEmail);
        return res.status(200).json(
            info
        );
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}


let handleGetDataCToChart = async (req, res) => {
    try {
        let dataChart = await ticketServices.getDataCToChart();
        if (dataChart) {
            return res.status(200).json({
                errCode: 0,
                errMessage: "Get all dataChart success",
                dataChart
            });
        } else {
            return res.status(200).json({
                errCode: 1,
                errMessage: "DataChart don't exist"
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



module.exports = {
    handleGetAllTicket, handleCreateNewTicket, handleVerifyTicket, handleUpdateTicket, handleDeleteTicket, handleSendThanksMail, handleGetDataCToChart
}