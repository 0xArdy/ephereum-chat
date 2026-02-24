type PasswordFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: 'current-password' | 'new-password';
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function PasswordField({
  id = 'password',
  label = 'Password',
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  onKeyDown,
}: PasswordFieldProps) {
  return (
    <div className='field'>
      <label className='field__label' htmlFor={id}>
        {label}
      </label>
      <input
        className='field__input'
        id={id}
        type='password'
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete}
      />
    </div>
  );
}
