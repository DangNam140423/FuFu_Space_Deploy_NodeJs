import userServices from '../services/userServices';
const cloudinary = require('cloudinary').v2;

let handleLogin = async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    if (!email || !password) {
        return res.status(200).json({
            errCode: 1,
            errMessage: 'Missing inputs parameter !'
        })

    }

    let userData = await userServices.hanleUserLogin(email, password);
    // check email exit in database
    // compare password
    // return infoUser
    // access_token: JWT json web token
    // set cookie
    res.cookie(
        "jwt", userData.jwtData,
        {
            httpOnly: true,
            sameSite: "None",
            secure: true
        }
        // httpOnly: true để phía react (javascript) không thể đọc
        // và hoặc thay đổi giá trị của cookie đó, 
        // giảm thiểu rủi ro bị tấn công Cross - Site Scripting(XSS)
    );
    return res.status(200).json({
        errCode: userData.errCode,
        errMessage: userData.errMessage,
        user: userData.user ? userData.user : {},
        jwtData: userData.jwtData ? userData.jwtData : {}
    })
}


const handleLogout = (req, res) => {
    try {
        res.clearCookie("jwt")
        return res.status(200).json({
            errCode: 0,
            errMessage: 'Clear cookie done!'
        })
    } catch (error) {
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}

let handleGetAllUser = async (req, res) => {
    try {
        let id = req.query.id; // ( all or id)
        let page = req.query.page;
        let limit = req.query.limit;
        if (page && limit) {
            if (id) {
                let users = await userServices.getUserWithPagination(id, +page, +limit);
                return res.status(200).json({
                    errCode: 0,
                    message: 'OK',
                    users
                })
            } else {
                return res.status(200).json({
                    errCode: 1,
                    message: 'Missing inputs parameter !',
                    users: []
                })
            }
        } else {
            if (id) {
                let users = await userServices.getAllUsers(id);
                return res.status(200).json({
                    errCode: 0,
                    message: 'OK',
                    users
                })
            } else {
                return res.status(200).json({
                    errCode: 1,
                    message: 'Missing inputs parameter !',
                    users: []
                })
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }

}

let handelCreateNewUser = async (req, res) => {
    try {
        let dataUser = req.body;
        dataUser.avatar = await (req.file && req.file.path) ? req.file.path : null;
        let message = await userServices.createNewUser(dataUser);
        if (req.file && req.file.filename && message.errCode !== 0) {
            cloudinary.uploader.destroy(req.file.filename);
        }

        return res.status(200).json(
            message
        )
    } catch (error) {
        if (req.file && req.file.filename) {
            cloudinary.uploader.destroy(req.file.filename);
        }
        console.log(error);
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}

let handelVeriFyUser = async (req, res) => {
    try {
        let info = await userServices.veriFyUser(req.body);
        return res.status(200).json(
            info
        )
    } catch (error) {
        return res.status(200).json({
            errCode: -1,
            errMessage: 'Error from the Server'
        })
    }
}

let handelEditUser = async (req, res) => {
    try {
        let user = req.body;
        let userOld = await userServices.getAllUsers(user.id);
        user.avatar = await (req.file && req.file.path) ? req.file.path : null;
        let message = await userServices.editUser(user);

        if (message.errCode === 0 && req.file && userOld[0].image) {
            let url = userOld[0].image;
            let urlArray = url.split("/");
            let filename = urlArray[7] + "/" + urlArray[8];
            cloudinary.uploader.destroy(filename.split(".")[0]);
        } else if (message.errCode !== 0 && req.file && req.file.filename) {
            cloudinary.uploader.destroy(req.file.filename);
        }
        return res.status(200).json(
            message
        )
    } catch (error) {
        console.log(error);
        if (req.file && req.file.filename) {
            cloudinary.uploader.destroy(req.file.filename);
        }
        return res.status(200).json({
            errCode: -1,
            errMessage: "Error form the server"
        });
    }
}

let handelDeleteUser = async (req, res) => {
    let message = await userServices.deleteUser(req.body.id);
    return res.status(200).json(
        message
    );
}

let handleHome = async (req, res) => {

    // let users = await db.User.findAll({
    //     attributes: {
    //         exclude: ['password']
    //     },
    //     order: [
    //         ['id', 'DESC'],
    //     ]
    // })
    return res.render('index.ejs'
        // , { dataUser: users }
    )
}

module.exports = {
    handleLogin, handleLogout,
    handleGetAllUser, handelCreateNewUser, handelVeriFyUser, handelEditUser, handelDeleteUser, handleHome
}