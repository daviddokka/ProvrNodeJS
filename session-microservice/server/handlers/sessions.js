'use strict';

const express = require('express');
const router = express.Router();

// Credentials mysql8.0
const MYSQL_HOST = process.env.MYSQL_HOST; // IP of MySQL instance on Google Cloud SQL
const MYSQL_PORT = process.env.MYSQL_PORT;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

// Open connection to the MySQL server
const mysql = require('mysql8.0');
const connection = mysql.createConnection({
  host     : MYSQL_HOST || 'localhost', 
  port     : MYSQL_PORT || 3306,
  user     : MYSQL_USER || 'root',
  password : MYSQL_PASSWORD || 'password',
  database : MYSQL_DATABASE || 'users'
});
// Checks for any errors upon connecting to the server
connection.connect(function(err){
if(!err) {
    console.log('Database is connected ...');
} else {
    console.log('Error when connecting to the MySQL database: ' + err.message);
}
});

const example = async (sessions, arrayToFill) => {
    for (const session of sessions) {
        const serverId = session.serverID;
        const server = await returnNum(serverId);
        arrayToFill.push ({
            sessionId: session.sessionID,
            sessionName: session.sessionName,
            mapName: session.mapName,
            maxParticipants: session.maxParticipants,
            participantCount: session.participantCount,
            hostUserId: session.hostUserID,
            hostIP: server.hostIP,
            hostPort: server.hostPort
        });
    }
    return arrayToFill;
}
  
const returnNum = (serverId, arrayToFill) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT hostIP, hostPort FROM Server WHERE serverID = ?', serverId, function (error, results, fields) {
            if (error) {
                reject(error);
            } else { 
                resolve(results[0]);
            }
        });
    });
}

router.get('/', function(req, res){

  const username = req.query.username;
  let sessionList = [];

  let errorPostionCount = 0;

  let isInvitedToSessions = false;

  connection.query('SELECT userID FROM User WHERE username = ?', username, function (error, results, fields) {
    if (error) {
      res.status(500);
      console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
      res.send({
        message:'Internal error'
      });
    } 
    else if (results.length > 0) {
      const userID = results[0].userID;
      connection.query('SELECT * FROM Invited_Participant WHERE userID = ?', userID, function (error, results, fields) {
        if (error) {
          res.status(500);
          console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
          res.send({
            message:'Internal error'
          });
        }
        /*
        else if (results.length > 0) {
          isInvitedToSessions = true;
          console.log('Here!');
          results.forEach(session => {
            const sessionId = session.sessionID;
            connection.query('SELECT serverID FROM Session WHERE sessionID = ?', sessionId, function (error, results, fields) {
              if (error) {
                res.status(500);
                console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
                res.send({
                  message:'Internal error'
                });
              } 
              else {
                const serverId = results[0].serverID;
                connection.query('SELECT hostIP, hostPort FROM Server WHERE serverID = ?', serverId, function (error, results, fields) {
                    if (error) {
                        res.status(500);
                        console.log('An error occured with the MySQL database: ' + error.message);
                        res.send({
                        message:'Internal error'
                        });
                    } else {
                        console.log('Heeere!')
                        sessionList.push ({
                            sessionId: session.sessionID,
                            sessionName: session.sessionName,
                            mapName: session.mapName,
                            maxParticipants: session.maxParticipants,
                            participantCount: session.participantCount,
                            hostUserId: session.hostUserId,
                            hostIP: results[0].hostIP,
                            hostPort: results[0].hostPort
                        });
                    }
                });
              }
            });
          });
        } 
        */
        else {
          connection.query('SELECT * FROM Session WHERE hostUserID = ?', userID, function (error, results, fields) {
            if (error) {
                res.status(500);
                console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
                res.send({
                    message:'Internal error'
                });
            } 
            else if (results.length > 0) {
                example(results, sessionList)
                .then((sessionInfo) => {
                    res.status(200);
                    res.send({
                        sessions: sessionInfo
                    });   
                })
                .catch((error) => {
                    res.status(500);
                    console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
                    res.send({
                        message:'Internal error'
                    });
                });
            }
            else {
                console.log('Here!!')
                if (isInvitedToSessions) {
                    res.status(200);
                    res.send({
                        sessions: sessionList
                    });   
                } else {
                    res.status(404);
                    res.send({
                        message:'User does not exist or no sessions are found'
                    });
                }
            }
          });
        }
      });
    }
    else {
      res.status(404);
      res.send({
        message:'User does not exist or no sessions found'
      });
    }
  });
});

router.post('/', function(req, res){

  const SessionDetails={
    'sessionName': req.body.sessionName,
    'mapName': req.body.mapName,
    'maxParticipants': req.body.maxParticipants,
    'hostUsername': req.body.hostUsername
  };

  let errorPostionCount = 0;

  let serverId;
  let hostId;

  connection.query('SELECT userID FROM User WHERE username = ?', SessionDetails.hostUsername, function (error, results, fields) {
    if (error) {
      res.status(500);
      // PRINT OUT THE SPECIFIC ERROR
      console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
      res.send({
          message:'Internal error'
      });
    } 
    else if (results.length > 0) {
        hostId = results[0].userID;
        connection.query('SELECT serverID FROM Server WHERE isAllocated = ?', false, function (error, results, fields) {
          if (error) {
            res.status(500);
            // PRINT OUT THE SPECIFIC ERROR
            console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
            res.send({
                message:'Internal error'
            });
          } 
          else if (results.length > 0) {
            serverId = results[0].serverID;
            connection.query('SELECT * FROM Session WHERE sessionName = ?', SessionDetails.sessionName, function (error, results, fields) {
              if (error) {
                 res.status(500);
                 // PRINT OUT THE SPECIFIC ERROR
                 console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
                 res.send({
                    message:'Internal error'
                 });
              } 
              else if (results.length > 0) {
                res.status(403);
                res.send({
                  message:'Session with the same name already exist for the user error'
                });
              } 
              else {
                connection.query('INSERT INTO Session (sessionName, mapName, maxParticipants, serverID, hostUserID, participantCount) VALUES (?, ?, ?, ?, ?, ?)', [SessionDetails.sessionName, SessionDetails.mapName, SessionDetails.maxParticipants, serverId, hostId, 0], function (error, results, fields) {
                  if (error) {
                    res.status(500);
                    // PRINT OUT THE SPECIFIC ERROR
                    console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
                    res.send({
                        message:'Internal error'
                    });
                  } 
                  else {
                    const sessionId = results.insertId;
                    connection.query('UPDATE Server SET isAllocated = ? WHERE serverID = ?', [true, serverId], function (error, results, fields) {
                      if (error) {
                        res.status(500);
                        // PRINT OUT THE SPECIFIC ERROR
                        console.log('An error occured with the MySQL database: ' + error.message + '. At position ' + (++errorPostionCount));
                        res.send({
                          message:'Internal error'
                        });
                      } 
                      else {
                        res.status(200);
                        res.send({
                            sessionId: sessionId
                        });
                      }
                    });
                  }
                });
              }
            });
          } 
          else {
            res.status(503);
            res.send({
               message:'No servers are currently available'
            });
          }
      });
    } 
    else {
      res.status(404);
      res.send({
          message:'User does not exist'
      });
    }
  });

});

router.delete('/:sessionId', function(req, res){

  const sessionId = req.params.sessionId;
  console.log('session id: ' + sessionId);

  connection.query('SELECT serverID FROM Session WHERE sessionID = ?', sessionId, function (error, results, fields) {
    if (error) {
      res.status(500);
      // PRINT OUT THE SPECIFIC ERROR
      console.log('An error occured with the MySQL database: ' + error.message);
      res.send({
          message:'Internal error'
      });
    }
    else if (results.length > 0) {
      const serverId = results[0].serverID;
      console.log('server id ' + serverId);
      connection.query('DELETE FROM Session WHERE sessionID = ?', sessionId, function (error, results, fields) {
        if (error) {
          res.status(500);
          // PRINT OUT THE SPECIFIC ERROR
          console.log('An error occured with the MySQL database: ' + error.message);
          res.send({
              message:'Internal error'
          });
        } 
        else {
          connection.query('UPDATE Server SET isAllocated = ? WHERE serverID = ?', [0, serverId], function (error, results, fields) {
            if (error) {
              res.status(500);
              // PRINT OUT THE SPECIFIC ERROR
              console.log('An error occured with the MySQL database: ' + error.message);
              res.send({
                  message:'Internal error'
              });
            } else {
              res.status(200);
              res.send({
                  message:'Session destroyed successfully'
              });
            }
          });
        }
      });
    } else {
      res.status(404);
      res.send({
          message:'Session does not exist'
      });
    }
  });
});

//export this router to use in our server.js
module.exports = router;