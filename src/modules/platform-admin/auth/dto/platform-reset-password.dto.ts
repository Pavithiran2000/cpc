import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

function MatchField(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'MatchField',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must match ${(args.constraints as string[])[0]}`;
        },
      },
    });
  };
}

export class PlatformResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  new_password: string;

  @IsString()
  @MinLength(8)
  @MatchField('new_password', { message: 'confirm_password must match new_password' })
  confirm_password: string;
}
