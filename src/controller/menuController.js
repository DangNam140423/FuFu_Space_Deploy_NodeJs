import db from '../models/index';
import menuServices from '../services/menuServices';

let handleGetAllMenu = async (req, res) => {
    try {
        let categoryInput = req.query.category;  // categoryInput = 'All' or 'ten_category'
        let page = req.query.page;
        let limit = req.query.limit;
        if (page && limit) {
            if (categoryInput) {
                let menus = await menuServices.getMenuWithPagination(categoryInput, +page, +limit);
                return res.status(200).json({
                    errCode: 0,
                    message: 'OK',
                    menus
                });
            } else {
                return res.status(200).json({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !',
                    menus: []
                })
            }
        } else {
            // categoryInput = 'All' or 'ten_category'
            if (categoryInput) {
                let menus = await menuServices.getAllMenu(categoryInput);
                return res.status(200).json({
                    errCode: 0,
                    message: 'OK',
                    menus
                });
            } else {
                return res.status(200).json({
                    errCode: 1,
                    errMessage: 'Missing inputs parameter !',
                    menus: []
                })
            }
        }
    } catch (e) {
        console.log(e);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}

let handelCreateNewDish = async (req, res, io) => {
    try {
        let dataToCreate = req.body;
        let message = await menuServices.createNewDish(dataToCreate.dataDish);
        if (message.errCode === 0) {
            let newMenu = await menuServices.getMenuWithPagination(dataToCreate.category_pre, dataToCreate.page_pre, dataToCreate.limi_pre);
            io.emit('newMenu', newMenu);
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

let handelEditDish = async (req, res, io) => {
    try {
        let dataToEdit = req.body;
        let message = await menuServices.editDish(dataToEdit.dataDish);
        if (message.errCode === 0) {
            let newMenu = await menuServices.getMenuWithPagination(dataToEdit.category_pre, dataToEdit.page_pre, dataToEdit.limi_pre);
            io.emit('newMenu', newMenu);
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

let handelDeleteDish = async (req, res, io) => {
    try {
        let dataToDelete = req.body;
        let message = await menuServices.deleteDish(dataToDelete.idDish);
        if (message.errCode === 0) {
            let newMenu = await menuServices.getMenuWithPagination(dataToDelete.category_pre, dataToDelete.page_pre, dataToDelete.limi_pre);
            io.emit('newMenu', newMenu);
        }

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


module.exports = {
    handleGetAllMenu, handelCreateNewDish, handelEditDish, handelDeleteDish
}