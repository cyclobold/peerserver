const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongodb = require("mongodb");
const mysql = require("mysql");
require("dotenv-defaults").config();
const app = express();



app.use(express.json());
app.use(cors());

//Email Setup
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'dashpayltd@gmail.com',
      pass: 'medi4cine'
    }
  });


//Database Connection ---
const _conn =  mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

_conn.getConnection(function(err, connection){
  if(err){
      return console.error("There was an error connecting to the Database: ", err.message)
  }

  console.log("Connected to the Database...");


})




//Functions 
async function createChat(author, connection_id, peer_email, time_created){

  let peers = {
    author_email: author.author_email,
    peer_email: peer_email
  }


  peers = JSON.stringify(peers);



  const sql = `INSERT INTO chats(chat_unique_id, peers, date_created) VALUES('${connection_id}', '${peers}',  '${time_created}')`;

  _conn.getConnection(function(err, connection){

    if(err){

    }


    connection.query(sql, function(query_error, result){

        if(query_error){
          console.log("Query error for insert user: ", query_error.message)
        }


        //Once chat has been created..
        //Get the id of the last inserted data..
        return result.insertId;
        

    })




  });


}





//End of Functions



  //initialize the server..
  //create the necessary tables
  const createChatsTable = `CREATE TABLE IF NOT EXISTS chats(
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              chat_unique_id VARCHAR(132) NOT NULL,
                              peers TEXT NOT NULL,
                              date_created VARCHAR(132)
                            )`;

  _conn.getConnection(function(err, connection){

          if(err){
                //Error here
                return console.error("There was an error connecting ...", err.message)
            }
                  
          connection.query(createChatsTable, function(query_error, results){
                  if(query_error){
                      console.error("Error running the query: ", query_error.message);
                  }
                  
                    
          })
                  
                            
    })
    


    //Create Chat Messages
    const createChatMessagesTable = `CREATE TABLE IF NOT EXISTS chats_messages(
                                      id INT AUTO_INCREMENT PRIMARY KEY,
                                      chat_unique_id VARCHAR(132) NOT NULL,
                                      message LONGTEXT,
                                      author_email INT,
                                      date_created TIMESTAMP
      )`

      _conn.getConnection(function(error, connection){
        if(error){

        }

        connection.query(createChatMessagesTable, function(err, result){
            if(err){
              //error creating the users..
            }

        });


    })



    
    //Create the users table
    const createUsersTable = `CREATE TABLE IF NOT EXISTS users(
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              name VARCHAR(120) NULL,
                              email VARCHAR(120) UNIQUE,
                              date_created TIMESTAMP
                              )`;

    _conn.getConnection(function(error, connection){
        if(error){

        }

        connection.query(createUsersTable, function(err, result){
            if(err){
              //error creating the users..
            }

        });


    })





//send email..
app.post("/peerserver/email/send", function(request, response){

    const recepient = request.body.recepient;
    const payload = request.body.payload;
    const author_name= request.body.author.author_name;
    const author_email = request.body.author.author_email;


    //send the email straight away..
    var mailOptions = {
        from: 'dashpayltd@gmail.com',
        to: recepient,
        subject: `Chat Invitation from ${author_name}`,
        html: `<body>
                    <h3>You have an invitation from ${author_name} ...</h3>
                    <hr>
                    <p>Here is the Invitation Id: ${payload}</p>

                    <p>Click here to join this chat: <a href='http://127.0.0.1:5500/join.html'>Join Chat</a></p>

                    <p>Then paste the Invitation ID...</p>

                    <hr>

                    <p>This invitation is from ${author_name} with email address: ${author_email}</p>
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
    peer_email = request.body.chat_data.peer_email;
    connection_id = request.body.chat_data.connection_id;
    time_created = request.body.chat_data.time;
    author = request.body.chat_data.author;


    author_name = author.author_name;
    author_email = author.author_email;

  

   //create the user accounts if they dont exist
   //check if this author has created a chat in the past
    checkUserQuery = `SELECT * FROM users WHERE email = '${author_email}' LIMIT 1`;

    _conn.getConnection(function(error, connection){
        if(error){

        }

        connection.query(checkUserQuery, async function(query_error, result){

              if(query_error){
                //
              }

              if(result.length == 1){
                //there is a match
                //the user has been created already..
                //create the chat
                const chat = await createChat(author, connection_id, peer_email, time_created);

                response.send({
                  message: "chat created",
                  data: {
                    chat_id: chat,
                  },
                  code: 'success'
                })


              }else{
                //create this new user account
                createUserQuery = `INSERT INTO users(name, email, date_created) VALUES('${author_name}', '${author_email}', NOW())`;

                _conn.getConnection(function(error, connection){
                  if(error){

                  }

                  connection.query(createUserQuery, async function(query_error, result){
                      if(query_error){
                        //
                      }


                      //after the user has been created..
                      const chat = await createChat(author, connection_id, peer_email, time_created);

                      response.send({
                        message: "chat created",
                        data: {
                          chat_id: chat,
                        },
                        code: 'success'
                      })



                  })

                })


              }

        })


    })


})

app.listen("5000", () => console.log("Server on PORT 5000"));