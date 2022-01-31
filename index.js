const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongodb = require("mongodb");
const mysql = require("mysql");
const Pusher = require("pusher");
const { send } = require("express/lib/response");
require("dotenv-defaults").config();
const app = express();


app.use(express.json());
app.use(cors());


//Pusher Setup
const pusher = new Pusher({
  appId: "1338629",
  key: "692bb295a55675b8521d",
  secret: "0c546b3c418cc8894b1e",
  cluster: "eu",
  useTLS: true
});


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



  const sql = `INSERT INTO chats(chat_unique_id, is_active, from_email, to_email, peers, date_created) VALUES('${connection_id}', true, '${author_email}', '${peer_email}',  '${peers}',  '${time_created}')`;

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



async function getChatMessages(connection_id){
  //Gets the chat messages for this chat connection_id
  
  // get_sql = `SELECT * FROM chats_messages WHERE chat_unique_id='${connection_id}'`;

  // _conn.getConnection(function(err, connection){
  //   if(err){
  //     //
  //   }

  //   connection.query(get_sql, function(query_error, results){
  //       if(query_error){
  //           //error running the query
  //           console.log("Error");
  //       }


  //       if(results.length > 0){
  //         console.log("Nothing here");

  //         return [];

  //       }else{

  //         return results;

  //       }


  //   })

  //   connection.release();

  // })


}



//End of Functions



  //initialize the server..
  //create the necessary tables
  const createChatsTable = `CREATE TABLE IF NOT EXISTS chats(
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              chat_unique_id VARCHAR(132) NOT NULL,
                              is_active BOOLEAN, 
                              from_email VARCHAR(132),
                              to_email VARCHAR(132),
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
                                      author_email VARCHAR(132),
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


app.get("/peerserver/connections/peer/check", function(request, response){
    //only the connectionId is needed here...
  
    const connectionKey = request.query.connectionKey;

    check_query = `SELECT * FROM chats WHERE chat_unique_id='${connectionKey}' AND is_active=true LIMIT 1`;

    _conn.getConnection(function(error, check_connection){
      if(error){

      }


      check_connection.query(check_query, function(check_error, check_results){

        if(check_error){
          //
        }

        if(check_results.length > 0){
          //there is results data..
          //load the chats ..

          get_chats_query = `SELECT * FROM chats_messages WHERE chat_unique_id='${connectionKey}'`;
          _conn.getConnection(function(get_chats_error, get_chats_connection){

            if(get_chats_error){

            }

            get_chats_connection.query(get_chats_query, function(err, get_chats_results){
                if(err){

                }


                if(get_chats_results.length > 0){
                  response.send({
                    message: "chat data available",
                    data: {
                        chat_messages: get_chats_results,
                        chat_data: check_results[0]
                    },
                    code: "chat-messages-available"
                  })

                }else{
                  response.send({
                    message: "chat data not available",
                    data: null,
                    code: "chat-messages-not-available"
                  })


                }


            })

            get_chats_connection.release();


          })
          



        }else{
          //no results here..
          response.send({
            message: "chat data not available",
            data: null,
            code: "chat-messages-not-available"
          })

        }

      })

      check_connection.release();


    })




})


app.post("/peerserver/connections/disconnect", function(request, response){

  connectionKey = request.body.connectionKey;

  disconnect_query = `UPDATE chats SET is_active=false WHERE chat_unique_id=${connectionKey} LIMIT 1`;

  _conn.getConnection(function(err, connection){
      if(err){
        //
      }

      connection.query(disconnect_query, function(remove_error, result){

        if(remove_error){
            //error disconnecting this user
            response.send({
              message: "Could not remove the chat data",
              data: null,
              code: "error"
            })

        }else{

          response.send({
            message: "Data removed",
            data: null,
            code: "success"
          });


        }



      })


  })



})



app.post("/peerserver/connections/retrieve-active", function(request, response){
    const chat_data = request.body.chat_data;

    const author = chat_data.author; //this contains the author_email and author_name
    const peer_email = chat_data.peer_email;
    
    const connection_id = chat_data.connection_id;

    //check the data database for this connection
    const check_query = `SELECT * FROM chats WHERE from_email='${author.author_email}' AND to_email='${peer_email}' AND chat_unique_id='${connection_id}' AND is_active=true LIMIT 1`;
    _conn.getConnection(function(err, connection){
        if(err){
            throw new Error("Error: ", err.message);
        }

        connection.query(check_query, async function(error, results){

            if(error){
                //run the error..
                throw new Error("Something went wrong: ", error.message)
            }


            if(results.length > 0){

                let check_result = results[0];

                //get the active chats 
                //console.log(await getChatMessages(connection_id))
                get_sql = `SELECT * FROM chats_messages WHERE chat_unique_id='${connection_id}'`;

                _conn.getConnection(function(err, get_chats_connection){
                  if(err){
                    //
                  }
              
                  get_chats_connection.query(get_sql, function(query_error, get_chats_results){
                      if(query_error){
                          //error running the query
                          console.log("Error");
                      }
              
              
                      if(get_chats_results.length > 0){
                        console.log("Nothing here");
                        response.send({
                          message: "An ongoing chat exists between peers",
                          data: {
                              chat_data: chat_data,
                              result: check_result,
                              chat_messages: get_chats_results
                          },
                          code: "success"
                      });
                      
              
                      }else{
              
                        response.send({
                          message: "No chat message has been sent in this connection",
                          data: {
                              chat_data: chat_data,
                              result: check_result,
                              chat_messages: get_chats_results
                          },
                          code: "success"
                      });
              
                      }
              
              
                  })
              
                  get_chats_connection.release();
              
                })


                //currentChatMessages = await getChatMessages(connection_id)
               

            }else{

                response.send({
                    message: "Operation not successful",
                    data: null,
                    code: "error"
                });


            }



        })
        connection.release();

    })

   

    

});


//Confirm the PeerKey
app.get("/peerserver/chat/data/check_key", function(request, response){
    peerKey = request.query.peerKey;

    //check if this key is valid

    let check_query = `SELECT * FROM chats WHERE chat_unique_id='${peerKey}' LIMIT 1`;
    
    _conn.getConnection(function(error, check_connection){

        if(error){
            throw new Error(error.message);
        }


        check_connection.query(check_query, function(check_error, results){

            if(check_error){
                //there is an error
                response.send({
                    message: "Internal Error. Could not connect: " + check_error.message,
                    data: {
                        chat_data: null,
                        peerKey: peerKey,
                        isValid: false
                    },
                    code: "error",

                })
            }

            if(results.length > 0){
                //there is a match
                response.send({
                    message: "Match found",
                    data: {
                        chat_data: results[0],
                        peerKey: peerKey,
                        isValid: true
                    },
                    code: "success",

                })


            }else{
                //there is no match..
                response.send({
                    message: "Match not found",
                    data: {
                        chat_data: null,
                        peerKey: peerKey,
                        isValid: false
                    },
                    code: "error",

                })
            }


        })

        check_connection.release();

    })





})

//The Receiver sends a message 
app.post("/peerserver/chat/receiver/save", function(request, response){

    //get the data
    const time_created = request.body.time_created;
    const connectionKey = request.body.connectionKey;
    const message = request.body.message;
    const sender_email = request.body.sender_email;

    //this receiver's email should have been registered as well..

    //save query
    save_query = `INSERT INTO chats_messages (chat_unique_id, message, author_email, date_created ) VALUES('${connectionKey}', '${message}', '${sender_email}', NOW())`;


    //proceed
    _conn.getConnection(function(error, saveConnection){
        if(error){
            throw new Error("Something wrong just happened: ", error.message)
        }


        saveConnection.query(save_query, function(save_error, results){

            if(save_error){
                //error..
                throw new Error("SOmething wrong just happened: ", save_error.message);
            }else{
                //success
                response.send({
                    message: "operation successful",
                    data: {
                        connectionKey: connectionKey,
                        id: results.insertId,
                        sender_email: sender_email,
                        message: message,
                        time_created: new Date(time_created)
                    },
                    code: "success"
                })

            }


        })

        saveConnection.release();



    })




})


//send a chat message
app.post("/peerserver/chatmessage/author/send", function(request, response){

  message = request.body.message;
  time_created = request.body.time_created;
  host_email = request.body.host_email;
  connection_id = request.body.connection_id;


  //add to the chats_messages table
  add_query = `INSERT INTO chats_messages(chat_unique_id, message, author_email, date_created) VALUES('${connection_id}', '${message}', 
              '${host_email}', NOW())`;


  _conn.getConnection(function(err, add_message_connection){
    if(err){
      //
    }

    add_message_connection.query(add_query, function(error, results){

      if(error){
        //show error 
        console.log(error.message);

        response.send({
          message: "message not added",
          data: null,
          code: "error"
        })
      }else{

        //return
        response.send({
          message: "message added",
          data: {
              message: message,
              date_created: new Date(time_created),
              chat_unique_id: connection_id,
              author_email: host_email, 
              id: results.insertId
          },
          code: "message_saved"
        })


      }




    })


    add_message_connection.release();



  });



})



app.get("/peerserver/connections/trigger-recepient-reload", function(request, response){
    //triggers an event 
    //this will ensure that the server 
    //the recepient must be listening before they can get information from this ..

    //console.log(request.query);
    console.log("before trigger");
    try{
      let reload_time;
      if(request.query.reload_time == null || request.query.reload_time == undefined){
          reload_time = new Date().getTime();
      }else{
          reload_time = request.query.reload_time;
      }
  
      console.log("Triggered");
  
      // response.setHeader("Content-Type", "text/event-stream");
  
      // sendTrigger(response , reload_time)
  
      pusher.trigger("chat-connections", "author-page-reloaded", {
        message: "author page has reloaded",
        data: {},
        code: "author-page-reloaded"
      });
  
      response.send("null");

    }catch(error){
      console.error("Error");
    }



})

function sendTrigger(response, reload_time){
    response.write("data: " + `trigger-reconnection-${reload_time}\n\n`);
}

app.listen("5000", () => console.log("Server on PORT 5000"));