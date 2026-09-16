if (typeof Bun === 'undefined') {
  throw new Error(
    '@buncord/builders requires the Bun runtime. Please run your application using "bun run".'
  );
}

export * from './enums.ts';
export * from './types.ts';

export type {
  IsLessThanOrEqual,
  StringLength,
  CheckMaxLength,
  CheckMinLength,
  CheckArrayLength,
  WithId,
  CheckUrl,
  AllowedSelectMenuRange,
  FileUploadRange,
  ExtractCustomIdsByType,
  ExtractAllCustomIds,
  ExtractButtonIds,
  ExtractSelectMenuIds,
  ExtractTextInputIds,
  ExtractCheckboxIds,
  ExtractCheckboxGroupIds,
  ExtractRadioGroupIds,
  ExtractFileUploadIds,
} from './utils/guards.ts';

export { SPEC_PROVENANCE, type SpecException, type RuleVerification } from './utils/ComponentConstraints.ts';
export {
  componentError,
  isComponentError,
  type ComponentError,
  type ComponentErrorCode,
  type ComponentErrorDetails,
} from './utils/ComponentError.ts';
export {
  generateComponentCode,
  type ComponentCodeGeneratorOptions,
} from './utils/ComponentCodeGenerator.ts';

export * from './builders/index.ts';
