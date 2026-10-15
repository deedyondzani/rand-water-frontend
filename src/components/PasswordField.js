import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * Validate a password against the backend policy:
 *   ≥ 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special
 * @returns {string|null} null if valid, otherwise a human-readable error message.
 */
export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter (A-Z).';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter (a-z).';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number (0-9).';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character (e.g. @ # $ ! % ^ & *).';
  return null;
}

/**
 * Reusable password input with live rule checklist.
 */
export default function PasswordField({
  value,
  onChange,
  label = 'Password',
  disabled = false,
  autoFocus = false,
  autoComplete = 'new-password',
  required = false,
  fullWidth = true,
  showChecklist = true,
}) {
  const rules = [
    { text: 'At least 8 characters',      ok: value.length >= 8 },
    { text: 'One uppercase letter (A-Z)', ok: /[A-Z]/.test(value) },
    { text: 'One lowercase letter (a-z)', ok: /[a-z]/.test(value) },
    { text: 'One number (0-9)',           ok: /[0-9]/.test(value) },
    { text: 'One special character',      ok: /[^A-Za-z0-9]/.test(value) },
  ];
  const allOk = rules.every((r) => r.ok);
  const showHint = value.length > 0 && !allOk;

  return (
    <Box>
      <TextField
        label={label}
        type="password"
        fullWidth={fullWidth}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        required={required}
        error={showHint}
        inputProps={{ minLength: 8 }}
      />
      {showChecklist && (
        <Box sx={{ mt: 1, ml: 0.5 }}>
          {rules.map((r, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {r.ok
                ? <CheckCircleIcon sx={{ fontSize: 14, color: '#28A743' }} />
                : <CancelIcon     sx={{ fontSize: 14, color: '#c0c0c0' }} />}
              <Typography
                variant="caption"
                sx={{
                  color: r.ok ? '#28A743' : '#9e9e9e',
                  fontWeight: r.ok ? 600 : 400,
                }}
              >
                {r.text}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
