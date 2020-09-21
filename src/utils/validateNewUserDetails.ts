import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";

export const validateNewUserDetails = (options: UsernamePasswordInput) => {
  if (!options.email.includes("@")) {
    return [
      {
        field: "email",
        message: "Invalid Email",
      },
    ];
  }

  if (options.username.length < 6) {
    return [
      {
        field: "username",
        message: "Username should contain at least 6 characters",
      },
    ];
  }

  if (options.password.length < 8) {
    return [
      {
        field: "password",
        message: "Password should contain at least 8 characters",
      },
    ];
  }

  if (options.username.includes("@")) {
    return [
      {
        field: "username",
        message: "Cannot include @",
      },
    ];
  }

  return null;
};
