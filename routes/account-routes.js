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
 * definitions:
 *   User:
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
 *           description: User role
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
 *              
*/



/**
 * @swagger 
 * path: 
 *  /api/account/signup/:
 *    post:
 *      tags: 
 *      - "Account"
 */
router.post('/signup', validators.signupValidator, accountControllers.signupController);
/**
 * @swagger 
 * path: 
 *  /api/account/signin/:
 *    post:
 *      tags: [Account]
 *      consumes: [application/json]
 *      produces: [appliaction/json]
 *      parameters:
 *      - in: "body"
 *        name: "body"
 *        description: User data that have to be provided
 *        required: true
 *        schema:
 *          $ref: '#/definitions/User'
 *
 */
router.post('/signin', accountControllers.signinController);
router.post('/signin/google', accountControllers.signinGoogleController);
router.post('/signin/facebook', accountControllers.signinFacebookController);
router.post('/activate', accountControllers.activateController);
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