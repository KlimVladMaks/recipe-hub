import { z } from 'zod'


// ========== Recipe ==========


export const RecipeReadSchema = z.object({

});


export const RecipeReadListSchema = z.array(RecipeReadSchema);


export const RecipeCreateSchema = z.object({
    
});


export const RecipeUpdateSchema = z.object({
    
});


// ========== RecipeMedia ==========


export const RecipeMediaReadSchema = z.object({
    
});


export const RecipeMediaReadListSchema = z.array(RecipeMediaReadSchema);


export const RecipeMediaCreateSchema = z.object({
    
});


export const RecipeMediaCreateListSchema = z.array(RecipeMediaCreateSchema);


export const RecipeMediaUpdateSchema = z.object({
    
});


export const RecipeMediaUpdateListSchema = z.array(RecipeMediaUpdateSchema);


// ========== Step ==========


export const StepReadSchema = z.object({
    
});


export const StepReadListSchema = z.array(StepReadSchema);


export const StepCreateSchema = z.object({
    
});


export const StepUpdateSchema = z.object({
    
});


// ========== StepMedia ==========


export const StepMediaReadSchema = z.object({
    
});


export const StepMediaReadListSchema = z.array(StepMediaReadSchema);


export const StepMediaCreateSchema = z.object({
    
});


export const StepMediaCreateListSchema = z.array(StepMediaCreateSchema);


export const StepMediaUpdateSchema = z.object({
    
});


export const StepMediaUpdateListSchema = z.array(StepMediaUpdateSchema);


// ========== RecipeRating ==========


export const RecipeRatingReadSchema = z.object({
    
});


export const RecipeRatingPutSchema = z.object({
    
});


// ========== SavedRecipe ==========


export const IsRecipeSavedReadSchema = z.object({
    
});
