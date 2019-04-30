'use-strict'

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendNotification = functions.firestore.document("Meetings/{meeting_id}/PendingUsers/{pending_id}").onWrite((change, context) => {
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
				id: user_id,
				role: role
			},
			topic: topic
		};
		admin.messaging().send(message).then((response) => {
			console.log("A data message has been sent", response);
			return;
		})
		.catch((error) => {
			console.log("Failed to send message", error);
		});
		return;
	});
});

