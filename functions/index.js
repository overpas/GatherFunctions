'use-strict'

// MessageTypes: 1 - a user has enrolled, 2 - you have been accepted;
// Topics: 	{meeting_id}_pending_users - to be notified when user enrolls;
// 		    {meeting_id}_accepted_{user_id} - to be notified of being accepted

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNotificationToAdmin = functions.firestore.document("Meetings/{meeting_id}/PendingUsers/{pending_id}").onWrite((change, context) => {
	const meeting_id = context.params.meeting_id;
	const pending_id = context.params.pending_id;
	console.log("Meeting ID = " + meeting_id + ", PendingUser ID = " + pending_id);
	return admin.firestore()
	    .collection("Meetings")
	    .doc(meeting_id)
	    .collection("PendingUsers")
	    .doc(pending_id)
	    .get()
	    .then((queryResult) => {
		    const user_id = queryResult.data().id;
		    const role = queryResult.data().role.toString();
		    const topic = meeting_id + "_pending_users";
		    console.log("User ID = " + user_id + ", Role = " + role);
		    var message = {
			    data: {
				    user_id: user_id,
				    meeting_id: meeting_id,
				    role: role,
				    type: "1"
			    },
			    topic: topic
		    };
		    admin.messaging()
		        .send(message)
		        .then((response) => {
			        console.log("A data message has been sent", response);
			        return;
		        })
		        .catch((error) => {
			        console.log("Failed to send message", error);
		        });
		    return;
	    });
});

exports.sendNotificationToPending = functions.firestore.document("Meetings/{meeting_id}/PendingUsers/{pending_id}").onDelete((snap, context) => {
	const deleted = snap.data();
	const meeting_id = context.params.meeting_id;
	const pending_id = context.params.pending_id;
	const topic = meeting_id + "_accepted_" + deleted.id;
	const user_id = deleted.id;
	const role = deleted.role.toString();
	console.log("Meeting ID = " + meeting_id + ", PendingUser ID = " + pending_id);
	console.log("Accepted user ID = " + deleted.id + ", role" + deleted.role);
	var message = {
		data: {
			user_id: user_id,
			meeting_id: meeting_id,
			role: role,
			type: "2"
		},
		topic: topic
	};
	admin.messaging()
	    .send(message)
	    .then((response) => {
		    console.log("A data message has been sent ", response);
		    return;
	    })
	    .catch((error) => {
		    console.log("Failed to send message", error);
	    });
	return "sendNotificationToPending finished";
});

exports.updateMessages = functions.firestore.document("Users/{user_id}").onUpdate((change, context) => {
	const user_id = context.params.user_id;
	const user_name = change.after.data().username;
	const user_photo_url = change.after.data().photoUrl;
	admin.firestore()
		.collection("Meetings")
		.get()
		.then(snapshot => {
    			if (snapshot.empty) {
      				console.log('No matching meetings.');
      				return;
    			}
    			return snapshot.forEach(doc => {
      				console.log(doc.id, '=>', doc.data());
				doc.ref.collection("Messages")
					.where('authorId', '==', user_id)
					.get()
					.then(messagesSnapshot => {
						if (messagesSnapshot.empty) {
      							console.log('No matching messages.');
      							return;
    						}
						return messagesSnapshot.forEach(messageDoc => {
							console.log(messageDoc.id, '=>', messageDoc.data());
							messageDoc.ref
								.update({
									authorName: user_name,
									authorPhotoUrl: user_photo_url
								})
								.then(messageRef => {
									console.log("Successfully updated " + messageRef.id);
									return;
								})
								.catch(updError => {
									console.log('Error updating message', updError);
								});
						});
					})
					.catch(messagesError => {
						console.log('Error getting messages', messagesError);
					});
    			});
  		})
  		.catch(err => {
    			console.log('Error getting meetings', err);
  		});
	return "updateMessages fired";
});

