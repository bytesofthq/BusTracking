const jwt = require('jsonwebtoken');
const Student = require('../models/StudentModel');
const Parent = require('../models/ParentModel');
const Driver = require('../models/DriverModel');
const Institute = require('../models/InstituteModel');

// Protect route against unauthorized users
exports.protect = async (req, res, next) => {
    try {
        let token;
        
        // 1. Get token from Authorization header or cookies
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[2] || req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'You are not logged in. Please log in to gain access.'
            });
        }

        // 2. Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token. Please log in again.'
            });
        }

        // 3. Find user based on decoded role and ID
        let user;
        const role = decoded.role;

        if (role === 'student') {
            user = await Student.findById(decoded.id);
        } else if (role === 'parent') {
            user = await Parent.findById(decoded.id);
        } else if (role === 'driver') {
            user = await Driver.findById(decoded.id);
        } else if (role === 'admin' || role === 'institute') {
            user = await Institute.findById(decoded.id);
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'The user belonging to this token no longer exists.'
            });
        }

        // 4. Attach user information to request
        // Convert to object so we can append properties dynamically if it is a Mongoose document
        const userObj = user.toObject ? user.toObject() : user;
        
        req.user = {
            ...userObj,
            id: user._id.toString(),
            role: role,
            instituteId: user.instituteId || user.Institute || (role === 'admin' || role === 'institute' ? user._id.toString() : undefined),
            busId: user.busId || user.Bus_id
        };

        next();
    } catch (err) {
        next(err);
    }
};

// Restrict access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action.'
            });
        }
        next();
    };
};
