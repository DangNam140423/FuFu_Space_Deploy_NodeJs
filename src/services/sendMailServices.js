import db from '../models/index';
require('dotenv').config();
import nodemailer from 'nodemailer'

let handleSendMailAuth = async (data) => {
    let transporter = nodemailer.createTransport({ // config mail server
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_APP,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });
    let content = '';
    let userId = data.dataUser.id;
    content += `
        <div style="padding: 10px; background-color: #003375">
            <div style="padding: 10px; background-color: white;">
                <h4 style="color: #0085ff">Xin chào ${data.dataUser.fullName}</h4>
                <p>Bạn nhận được mail này vì đã được đăng ký tài khoản tại tại FuFu' Space thành công!</p>
                <p>Hãy click vào nút "Xác nhận" bên dưới để kích hoạt tài khoản của bạn</p>
                <a href="${data.redirectLink}" target="_blank" >xác nhận<a/>

                <p>Xin chân thành cảm ơn!</p>
            </div>
        </div>
    `;
    let info = await transporter.sendMail({
        // from: {
        //     name: process.env.NAME_APP,
        //     address: process.env.EMAIL_APP
        // },
        from: process.env.NAME_APP + '<' + process.env.EMAIL_APP + '>',
        to: data.dataUser.email,
        subject: 'Xác thực tài khoản người dùng',
        html: content,
    })
    // transporter.sendMail(mainOptions, function (err, info) {
    //     if (err) {
    //         console.log(err);
    //         // req.flash('mess', 'Lỗi gửi mail: ' + err); 
    //         //Gửi thông báo đến người dùng
    //     } else {
    //         console.log('Message sent: ' + info.response);
    //         // req.flash('mess', 'Một email đã được gửi đến tài khoản của bạn'); 
    //         //Gửi thông báo đến người dùng
    //     }
    // });
}

module.exports = {
    handleSendMailAuth
}