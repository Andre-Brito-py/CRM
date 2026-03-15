import { check } from 'express-validator';
import initMiddleware from '@/lib/server/init-middleware';
import validate from '@/lib/server/validate';

const rules = [
  check('aiContext')
    .isLength({ max: 5000 })
    .withMessage('AI context must not exceed 5000 characters'),
];

const validateUpdateWorkspaceAiContext = initMiddleware(validate(rules));

export default validateUpdateWorkspaceAiContext;
