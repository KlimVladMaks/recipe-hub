import { Router } from "express";


const router = Router();


// ========== USER SERVICE ==========


router.use('/auth');
router.use('/users/me/subscriptions');
router.use('/users/me/subscribers');
router.use('/users/me/feed');
router.use('/users/me/password');
router.use('/users/me');
router.use('/users/:userId/subscribe');
router.use('/users/:userId/subscriptions');
router.use('/users/:userId/subscribers');
router.use('/users/:userId/role');
router.use('/users/:userId');
router.use('/users');


// ========== RECIPE SERVICE ==========


router.use('/dish-types');
router.use('/ingredients');
router.use('/recipes');
router.use('/users/me/recipes');
router.use('/users/me/saved-recipes');
router.use('/users/:userId/recipes');
router.use('/users/:userId/saved-recipes');


export default router;
