const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongodb = require("mongodb");
const app = express();



app.use(express.json());
app.use(cors());


var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'dashpayltd@gmail.com',
      pass: 'medi4cine'
    }
  });


//send email..
app.post("/peerserver/email/send", function(request, response){

    const recepient = request.body.recepient;
    const payload = request.body.payload;

    //send the email straight away..

    var mailOptions = {
        from: 'dashpayltd@gmail.com',
        to: recepient,
        subject: 'Chat Invitation',
        html: `<body>
                    <h3>You have an invitation ...</h3>
                    <hr style='width: 50%;'>
                    <p>Here is the Invitation Id: ${payload}</p>

                    <p>Click here to join this chat: <a href='http://127.0.0.1:5500/join.html'>Join Chat</a></p>

                    <p>Then paste the Invitation ID...</p>
            </body>`
      };

      console.log("working ...");

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response);

            //emai sent

            response.send({
                message: "Email sent!",
                data: {
                    response_data: info.response, 
                },
                code: "success"
            })
          }


      })


});



app.post("/peerserver/chat/create", function(request, response){

    //create a new chat server..
    //data will be stored on our server




})

app.listen("5000", () => console.log("Server on PORT 5000"));