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

let handleSendMailSystemTicket = async (data) => {
    // Khai báo CSS inline cho các phần tử HTML
    let headerStyle = "color: #0085ff; text-align: center;";
    let buttonStyle = "background-color: #43CD80; color: white; padding: 10px; text-decoration: none; border-radius: 5px;";
    let buttonStyle2 = "background-color: #CD5555; color: white; padding: 10px; text-decoration: none; border-radius: 5px; margin-left: 100px;";

    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_APP,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });

    let content = `
        <div style="padding: 10px; background-color: #003375; font-size: 16px">
            <div style="padding: 10px; background-color: white;">
                <h3 style="${headerStyle}">Xin chào quản lý của hệ thống Fufu's Space</h3>
                <p>Bạn có 1 vé cần xác nhận:</p>
                <p>- Ngày đặt: ${data.formattedDate}</p>
                <p>- Khung giờ: ${data.timeType}</p>
                <p>- Tên khách hàng: ${data.nameCustomer}</p>
                <p>- SDT: ${data.phoneCustomer}</p>
                <p>- Email: ${data.emailCustomer}</p>
    `;

    if (data.numberAdultBest > 0) {
        content += `<p>- Số lượng người lớn: ${data.numberAdultBest}</p>`;
    }

    if (data.numberKidBest > 0) {
        content += `<p>- Số lượng trẻ em: ${data.numberKidBest}</p>`;
    }

    content += `
                <p>- Tổng hóa đơn: ${(data.bill * 1).toLocaleString('vi', { style: 'currency', currency: 'VND' })}</p>
                <p>Hình ảnh hóa đơn của khách hàng đã được đính kèm bên dưới</p>
                <p>Hãy click vào nút <b style="color: #43CD80">Xác nhận</b>, để cập nhật vé của khách hàng <b style="color: #43CD80">THÀNH CÔNG</b></p>
                <p>Hãy click vào nút <b style="color: #CD5555">Hủy</b>, để cập nhật vé của khách hàng <b style="color: #CD5555">KHÔNG THÀNH CÔNG</b></p>
                <a href="${data.redirectLink}" style="${buttonStyle}" target="_blank">Xác nhận</a>
                <a href="${data.redirectLinkCancle}" style="${buttonStyle2}" target="_blank">Hủy</a>
                <p style="text-align: right">FuFu Ticket System!</p>
            </div>
        </div>
    `;

    let recipients = ['dangnamta@gmail.com', 'hangiaphungggg@gmail.com', 'namtd.21it@vku.udn.vn']
    let usersAdmin = await db.User.findAll({
        where: {
            roleId: {
                [db.Sequelize.Op.in]: ['R1', 'R0']
            }
        },
        attributes: ['email']
    });
    let emails = usersAdmin.map(user => user.email);
    let index = emails.indexOf('dangnamta@gmail.com'); // Tìm vị trí của phần tử cần xóa
    if (index !== -1) {
        emails.splice(index, 1); // Xóa phần tử tại vị trí đã tìm thấy
    }

    let info = await transporter.sendMail({
        from: 'FuFu Ticket System' + '<' + process.env.EMAIL_APP + '>',
        to: emails.join(', '),
        subject: 'Xác nhận vé online cho khách hàng',
        html: content,
        attachments: [
            {
                filename: data.fileName,
                path: data.filePath
            }
        ]
    });
}

let handleMailResponses = async (data) => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_APP,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });

    let content = `
    <div style="padding: 10px; background-color: #003375; font-size: 16px">
        <div style="padding: 5px; background-color: white;">
            <img style="height: 95px" src="${process.env.URL_REACT_USER}/static/media/logo_fufu.89fef136.jpg" alt="ticketImage"/>
            <p>Chào ${data.nameCustomer}</p>
            <p>Chúng tôi xin gửi lời cảm ơn đặc biệt đến bạn đã lựa chọn Fufu's Space để thưởng thức ẩm thực. Đơn đặt chỗ của bạn đã được xác nhận <b style="color: #43CD80; font-size: 18px">Thành Công!</b></p>
            <b>Thông tin đặt: </b>
            <p><b>- Ngày đặt:</b> ${data.date}</p>
            <p><b>- Khung giờ:</b> ${data.timeType}</p>
            <p><b>- Tên khách hàng:</b> ${data.nameCustomer}</p>
            <p><b>- SDT:</b> ${data.phoneCustomer}</p>
            <p><b>- Email:</b> ${data.emailCustomer}</p>
            `;

    if (data.numberAdultBest > 0) {
        content += `<p><b>- Số lượng người lớn:</b> ${data.numberAdultBest}</p>`;
    }

    if (data.numberKidBest > 0) {
        content += `<p><b>- Số lượng trẻ em:</b> ${data.numberKidBest}</p>`;
    }

    content += `
            <p><b>- Tổng hóa đơn:<b> ${(data.bill * 1).toLocaleString('vi', { style: 'currency', currency: 'VND' })}</p>
            <p>Đơn đặt chỗ của bạn đã được xác nhận. Hãy mang theo email này khi đến quán để được nhận vé vật lý tại cổng nha. Quý khách hãy có mặt trước 5 phút trước giờ đặt để nhận vé một cách thuận lợi.</p>
            <p><b>Vé điện tử (E-Ticket):</b> [Đính kèm bên dưới]</p>
            <p>Nếu bạn có bất kỳ thắc mắc hoặc cần hỗ trợ thêm, đừng ngần ngại liên hệ với chúng tôi qua số điện thoại 0349601619/0901673037 hoặc email này.</p>
            <p>Chúng tôi mong sớm được chào đón bạn tại <b>Fufu's Space</b> để cùng nhau thưởng thức một bữa ăn đầy hạnh phúc.</p>
            <p>Trân trọng, <b>Fufu's Space</b></p>
        </div>
    </div>
`;


    let attachments = [];


    const path = require('path');

    // Đường dẫn thư mục gốc của ứng dụng trên Heroku
    const rootPath = process.cwd();

    // Đường dẫn thư mục lưu trữ ảnh
    const imageTicketDir = path.join(rootPath, 'imageTicket');

    for (let i = 1; i <= data.numberPeople; i++) {
        if (i <= 9) {
            let fileName = `ticketImage_${i}.jpg`;

            // Tạo đường dẫn tệp
            const filePath = path.join(imageTicketDir, fileName);

            let attachment = {
                filename: `ticketImage_${i}.jpg`,
                path: filePath
            };
            attachments.push(attachment);
        }
    }

    let info = await transporter.sendMail({
        from: 'FuFu Ticket System' + '<' + process.env.EMAIL_APP + '>',
        to: data.emailCustomer,
        subject: "Xác Nhận Đơn Đặt Và Gửi Vé E-Ticket - FuFu's Space",
        html: content,
        attachments: attachments
    });
}


let handleMailResponsesCancle = async (data) => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_APP,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });

    let content = `
    <div style="padding: 10px; background-color: #003375; font-size: 16px">
        <div style="padding: 5px; background-color: white;">
            <img style="height: 95px" src="${process.env.URL_REACT_USER}/static/media/logo_fufu.89fef136.jpg" alt="ticketImage"/>
            <p>Chào ${data.nameCustomer}</p>
            <p>Trước tiên, chúng tôi xin gửi lời cảm ơn đặc biệt đến bạn đã chọn Fufu's Space để thưởng thức ẩm thực của chúng tôi.</p>
            <p>Nhưng trạng thái đơn đặt của bạn đã bị <b style="color: #CD5555; font-size: 18px">Hủy</b> vì không hợp lệ</p>
            <p>Lí do: Chưa nhận được thanh toán thành công từ bạn</p>
            <b>Thông tin đặt: </b>
            <p><b>- Ngày đặt:</b> ${data.date}</p>
            <p><b>- Khung giờ:</b> ${data.timeType}</p>
            <p><b>- Tên khách hàng:</b> ${data.nameCustomer}</p>
            <p><b>- SDT:</b> ${data.phoneCustomer}</p>
            <p><b>- Email:</b> ${data.emailCustomer}</p>
            `;

    if (data.numberAdultBest > 0) {
        content += `<p><b>- Số lượng người lớn:</b> ${data.numberAdultBest}</p>`;
    }

    if (data.numberKidBest > 0) {
        content += `<p><b>- Số lượng trẻ em:</b> ${data.numberKidBest}</p>`;
    }

    content += `
            <p><b>- Tổng hóa đơn:<b> ${(data.bill * 1).toLocaleString('vi', { style: 'currency', currency: 'VND' })}</p>
            <p>Nếu bạn muốn đặt lại vé, hãy truy cập đường link sau để đặt lại: <a href="${process.env.URL_REACT_USER}">FuFu'Space</a></p>
            <p>Hoặc bạn có bất kỳ thắc mắc hay cần hỗ trợ thêm, đừng ngần ngại liên hệ với chúng tôi qua số điện thoại 0349601619/0901673037 hoặc email này.</p>
            <p>Trân trọng, <b>Fufu's Space</b></p>
        </div>
    </div>
`;

    let info = await transporter.sendMail({
        from: 'FuFu Ticket System' + '<' + process.env.EMAIL_APP + '>',
        to: data.emailCustomer,
        subject: "Xác Nhận Đơn Đặt Và Gửi Vé E-Ticket - FuFu's Space",
        html: content,
    });
}

module.exports = {
    handleSendMailAuth, handleSendMailSystemTicket,
    handleMailResponses, handleMailResponsesCancle
}