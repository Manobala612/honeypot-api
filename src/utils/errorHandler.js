// src/utils/errorHandler.js
import { RESPONSE_STATUS } from './constants.js';

export function buildError(message, code = 500) {
  return {
    status: RESPONSE_STATUS.ERROR,
    error: {
      message,
      code
    }
  };
}