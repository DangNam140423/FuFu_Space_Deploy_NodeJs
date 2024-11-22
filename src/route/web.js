import express from "express";
import userController from '../controller/userController';
import codeController from '../controller/codeController';
import staffController from '../controller/staffController';
import menuController from '../controller/menuController';
import aboutController from '../controller/aboutController';
import scheduleController from '../controller/scheduleController.js';
import accountController from '../controller/accountController.js'
import tableController from '../controller/tableController.js';
import ticketController from '../controller/ticketController.js'
import groupController from '../controller/groupController.js'
import homeController from '../controller/homeController.js'

import { checkMiddelwareUserJWT, checkUserPermissonJWT } from '../middleware/jwtAction.js'
import uploadCloudinary from "../middleware/uploadCloudinary.js";

let router = express.Router();

// const isAdmin = require("./middlewares")


const initWebRoute = (app, io) => {
    router.get('/', userController.handleHome);



    //                            API SYSTEM ADIM
    router.all('*', checkMiddelwareUserJWT, checkUserPermissonJWT)

    router.post('/api/login', userController.handleLogin);
    router.post('/api/logout', userController.handleLogout);
    router.post('/api/register');
    router.get('/api/account', accountController.getUserAccount);


    router.get('/api/get-all-user', userController.handleGetAllUser);
    router.post('/api/create-new-user', uploadCloudinary.single('avatar'), userController.handelCreateNewUser);
    router.post('/api/verify-user', userController.handelVeriFyUser);
    router.put('/api/edit-user', uploadCloudinary.single('avatar'), userController.handelEditUser);
    router.delete('/api/delete-user', userController.handelDeleteUser);


    // router.get('/api/get-top-staff-home', staffController.getTopStaffHome);


    router.get('/api/get-all-code', codeController.handleGetAllCode);

    // router.get('/api/get-all-category-menu', menuController.handleGetAllCategoryMenu);
    router.get('/api/get-all-menu', menuController.handleGetAllMenu);
    router.post('/api/create-new-dish', (req, res) => menuController.handelCreateNewDish(req, res, io));
    router.put('/api/edit-dish', (req, res) => menuController.handelEditDish(req, res, io));
    router.delete('/api/delete-dish', (req, res) => menuController.handelDeleteDish(req, res, io));


    // router.get('/api/get-about', aboutController.handleGetAbout);
    // router.put('/api/edit-about', aboutController.handleEditAbout);


    router.post('/api/get-schedule', scheduleController.handleGetSchedule);
    router.post('/api/get-schedule2', scheduleController.handleGetSchedule2);
    router.post('/api/bulk-create-schedule', (req, res) => scheduleController.handleSaveNewSchedule(req, res, io));


    router.get('/api/get-all-table', tableController.handleGetAllTable);
    router.post('/api/create-table', tableController.handleCreateNewTable);
    router.put('/api/update-table', tableController.handleUpdateTable);
    router.delete('/api/delete-table', tableController.handleDeleteTable);
    router.post('/api/get-table-empty', tableController.handleGetTableEmptyBySchedule);


    router.post('/api/get-all-ticket', ticketController.handleGetAllTicket);
    router.post('/api/create-ticket', (req, res) => ticketController.handleCreateNewTicket(req, res, io));
    router.post('/api/verify-ticket', (req, res) => ticketController.handleVerifyTicket(req, res, io));
    router.put('/api/update-ticket', (req, res) => ticketController.handleUpdateTicket(req, res, io));
    router.delete('/api/delete-ticket', (req, res) => ticketController.handleDeleteTicket(req, res, io));
    router.post('/api/send-thanks-email', ticketController.handleSendThanksMail);
    router.get('/api/get-data-chart', ticketController.handleGetDataCToChart);



    router.get('/api/get-all-group', groupController.handleGetAllGroup);


    router.get('/api/get-data-home', homeController.handleGetDataHome)

    //                            API SYSTEM USER
    router.get('/api/user/get-all-menu', menuController.handleGetAllMenu);

    router.post('/api/user/get-schedule2', scheduleController.handleGetSchedule2);

    router.post('/api/user/get-table-empty', tableController.handleGetTableEmptyBySchedule);

    router.post('/api/user/create-ticket', (req, res) => ticketController.handleCreateNewTicket(req, res, io));

    router.get('/api/user/get-top-staff-home', staffController.getTopStaffHome);
    return app.use('/', router)
}


export default initWebRoute;
