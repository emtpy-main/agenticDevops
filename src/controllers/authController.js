const admin = require('../firebaseAdmin');

const verifyToken = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Verify the ID token using Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Here you could save user data to a database, update last login, etc.
        // For now, we just respond with success and the user's UID and email
        const uid = decodedToken.uid;
        const email = decodedToken.email;

        res.status(200).json({
            message: "Authentication successful",
            user: { uid, email }
        });
    } catch (error) {
        console.error("Error verifying auth token", error);
        res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
};

module.exports = { verifyToken }