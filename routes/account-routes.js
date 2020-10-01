// libraries imports
const express = require('express');

// my own imports
const accountControllers = require('../controllers/account-controllers');
const validators = require('../helpers/body-validators')

// --------
const router = express.Router();

/**
 * * ---- TAG
 * @swagger
 * tags:
 *  name: Account
 *  description: Manage user account
*/

/**
 * * ---- DEFINITIONS
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required: [name, email, password]
 *       properties:
 *         id:
 *           type: integer
 *           description: User id (auto-generated)
 *         name:
 *           type: string
 *           description: User name
 *         email:
 *           type: string
 *           description: User email
 *         password:
 *           type: string
 *           description: User password
 *         role:
 *           type: string
 *           default: user
 *           description: User role
 *         isActive:
 *           type: boolean
 *           default: false
 *           description: User account status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation date
 *         updateAt:
 *           type: string
 *           format: date-time
 *           description: User last updation date
 *       example:
 *          name: Fluffy User
 *          email: fluffy_u@xmail.com
 *          password: testpassword
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT    
*/



/**
 * @swagger 
 * path: 
 *  /api/account/signup/:
 *    post:
 *      tags: [Account]
 *      summary: Create new user
 *      consumes:
 *       - application/json
 *      parameters:
 *        - in: body
 *          name: user
 *          description: The user to create.
 *          schema:
 *            type: object
 *            required: [name, email, password, passwordConfirmation]
 *            properties:
 *              name:
 *                type: string
 *                description: Name could has 4 <> 32 characters
 *              email:
 *                type: string
 *              password:
 *                type: string
 *                description: Password should contains at least 6. characters
 *              passwordConfirmation:
 *                type: string
 *                description: Password confirmation must match with password
 *            example:
 *              name: userName
 *              email: user@user.com
 *              password: testpassword
 *              passwordConfirmation: testpassword
 *      responses:
 *         201:
 *           description: User has been created
 *         409:
 *           description: User already exists in database
 *         422:
 *           description: Invalid inputs has been provided
 *         500:
 *           description: Internal server error
 */
router.post('/signup', validators.signupValidator, accountControllers.signupController);

/**
 * @swagger 
 * path: 
 *  /api/account/activate/:
 *    post:
 *      tags: [Account]
 *      summary: Activate user
 *      security:
 *        - bearerAuth: []
 *      responses:
 *         204:
 *           description: User account has been activated
 *         403:
 *           description: Authentication failed
 *         500:
 *           description: Internal server error
 */
router.post('/activate', accountControllers.activateController);

/**
 * @swagger 
 * path: 
 *  /api/account/signin/:
 *    post:
 *      tags: [Account]
 *      
 */
router.post('/signin', accountControllers.signinController);
router.post('/signin/google', accountControllers.signinGoogleController);
router.post('/signin/facebook', accountControllers.signinFacebookController);

router.put('/password/forgot', accountControllers.forgotPasswordController);
router.put('/password/reset', accountControllers.resetPasswordController);

// -- export
module.exports = router;

 /**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */
/**
 * @swagger
 * path:
 *  /users/:
 *    post:
 *      summary: Create a new user
 *      tags: [Users]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/User'
 *      responses:
 *        "200":
 *          description: A user schema
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/User'
 */