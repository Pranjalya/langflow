import IconComponent from "@/components/common/genericIconComponent";
import * as Form from "@radix-ui/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { CONTROL_NEW_USER } from "../../constants/constants";
import { AuthContext } from "../../contexts/authContext";
import {
  UserInputType,
  UserManagementType,
  inputHandlerEventType,
} from "../../types/components";
import BaseModal from "../baseModal";

export default function UserManagementModal({
  title,
  titleHeader,
  cancelText,
  confirmationText,
  children,
  icon,
  data,
  index,
  onConfirm,
  asChild,
}: UserManagementType) {
  const [pwdVisible, setPwdVisible] = useState(false);
  const [confirmPwdVisible, setConfirmPwdVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(data?.password ?? "");
  const [username, setUserName] = useState(data?.username ?? "");
  const [confirmPassword, setConfirmPassword] = useState(data?.password ?? "");
  const [isActive, setIsActive] = useState(data?.is_active ?? false);
  const [isSuperUser, setIsSuperUser] = useState(data?.is_superuser ?? false);
  const [isProjectAdmin, setIsProjectAdmin] = useState(data?.user_level === "PROJECT_ADMIN");
  const [inputState, setInputState] = useState<UserInputType>(CONTROL_NEW_USER);
  const { userData } = useContext(AuthContext);

  function handleInput({
    target: { name, value },
  }: inputHandlerEventType): void {
    setInputState((prev) => {
      const newState = { ...prev, [name]: value };
      if (name === "is_superuser" && value === true) {
        newState.user_level = "SUPER_ADMIN";
      } else if (name === "is_superuser" && value === false) {
        newState.user_level = "USER";
      }
      return newState;
    });
  }

  useEffect(() => {
    if (open) {
      if (!data) {
        resetForm();
        setInputState(CONTROL_NEW_USER);
      } else {
        setUserName(data.username);
        setIsActive(data.is_active);
        setIsSuperUser(data.is_superuser);
        setIsProjectAdmin(data.user_level === "PROJECT_ADMIN");

        handleInput({ target: { name: "username", value: data.username } });
        handleInput({ target: { name: "is_active", value: !!data.is_active } });
        handleInput({ target: { name: "is_superuser", value: !!data.is_superuser } });
        handleInput({ target: { name: "user_level", value: data.user_level || "USER" } });

        if (data.is_superuser) {
          handleInput({ target: { name: "user_level", value: "SUPER_ADMIN" } });
        } else if (data.user_level === "PROJECT_ADMIN") {
          handleInput({ target: { name: "user_level", value: "PROJECT_ADMIN" } });
        } else {
          handleInput({ target: { name: "user_level", value: "USER" } });
        }
      }
    }
  }, [open]);

  function resetForm() {
    setPassword("");
    setUserName("");
    setConfirmPassword("");
    setIsActive(false);
    setIsSuperUser(false);
    setIsProjectAdmin(false);
    setInputState(CONTROL_NEW_USER);
  }

  return (
    <BaseModal size="medium-h-full" open={open} setOpen={setOpen}>
      <BaseModal.Trigger asChild={asChild}>{children}</BaseModal.Trigger>
      <BaseModal.Header description={titleHeader}>
        <span className="pr-2">{title}</span>
        <IconComponent
          name={icon}
          className="h-6 w-6 pl-1 text-foreground"
          aria-hidden="true"
        />
      </BaseModal.Header>
      <BaseModal.Content>
        <Form.Root
          onSubmit={(event) => {
            if (password !== confirmPassword) {
              event.preventDefault();
              return;
            }
            resetForm();
            onConfirm(1, inputState);
            setOpen(false);
            event.preventDefault();
          }}
        >
          <div className="grid gap-5">
            <Form.Field name="username">
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <Form.Label className="data-[invalid]:label-invalid">
                  Username{" "}
                  <span className="font-medium text-destructive">*</span>
                </Form.Label>
              </div>
              <Form.Control asChild>
                <input
                  onChange={({ target: { value } }) => {
                    handleInput({ target: { name: "username", value } });
                    setUserName(value);
                  }}
                  value={username}
                  className="primary-input"
                  required
                  placeholder="Username"
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="field-invalid">
                Please enter your username
              </Form.Message>
            </Form.Field>

            <div className="flex flex-row">
              <div className="mr-3 basis-1/2">
                <Form.Field
                  name="password"
                  serverInvalid={password != confirmPassword}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                    }}
                  >
                    <Form.Label className="data-[invalid]:label-invalid flex">
                      Password{" "}
                      <span className="ml-1 mr-1 font-medium text-destructive">
                        *
                      </span>
                      {pwdVisible && (
                        <Eye
                          onClick={() => setPwdVisible(!pwdVisible)}
                          className="h-5 cursor-pointer"
                          strokeWidth={1.5}
                        />
                      )}
                      {!pwdVisible && (
                        <EyeOff
                          onClick={() => setPwdVisible(!pwdVisible)}
                          className="h-5 cursor-pointer"
                          strokeWidth={1.5}
                        />
                      )}
                    </Form.Label>
                  </div>
                  <Form.Control asChild>
                    <input
                      onChange={({ target: { value } }) => {
                        handleInput({ target: { name: "password", value } });
                        setPassword(value);
                      }}
                      value={password}
                      className="primary-input"
                      required={data ? false : true}
                      type={pwdVisible ? "text" : "password"}
                    />
                  </Form.Control>

                  <Form.Message className="field-invalid" match="valueMissing">
                    Please enter a password
                  </Form.Message>

                  {password != confirmPassword && (
                    <Form.Message className="field-invalid">
                      Passwords do not match
                    </Form.Message>
                  )}
                </Form.Field>
              </div>

              <div className="basis-1/2">
                <Form.Field
                  name="confirmpassword"
                  serverInvalid={password != confirmPassword}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                    }}
                  >
                    <Form.Label className="data-[invalid]:label-invalid flex">
                      Confirm password{" "}
                      <span className="ml-1 mr-1 font-medium text-destructive">
                        *
                      </span>
                      {confirmPwdVisible && (
                        <Eye
                          onClick={() =>
                            setConfirmPwdVisible(!confirmPwdVisible)
                          }
                          className="h-5 cursor-pointer"
                          strokeWidth={1.5}
                        />
                      )}
                      {!confirmPwdVisible && (
                        <EyeOff
                          onClick={() =>
                            setConfirmPwdVisible(!confirmPwdVisible)
                          }
                          className="h-5 cursor-pointer"
                          strokeWidth={1.5}
                        />
                      )}
                    </Form.Label>
                  </div>
                  <Form.Control asChild>
                    <input
                      onChange={(input) => {
                        setConfirmPassword(input.target.value);
                      }}
                      value={confirmPassword}
                      className="primary-input"
                      required={data ? false : true}
                      type={confirmPwdVisible ? "text" : "password"}
                    />
                  </Form.Control>
                  <Form.Message className="field-invalid" match="valueMissing">
                    Please confirm your password
                  </Form.Message>
                </Form.Field>
              </div>
            </div>
            <div className="flex gap-8">
              <Form.Field name="is_active">
                <div>
                  <Form.Label className="data-[invalid]:label-invalid mr-3">
                    Active
                  </Form.Label>
                  <Form.Control asChild>
                    <Checkbox
                      checked={isActive}
                      id="is_active"
                      className="relative top-0.5"
                      onCheckedChange={(value) => {
                        handleInput({ target: { name: "is_active", value: Boolean(value) } });
                        setIsActive(Boolean(value));
                      }}
                    />
                  </Form.Control>
                </div>
              </Form.Field>
              {userData?.is_superuser && (
                <>
                  <Form.Field name="is_superuser">
                    <div>
                      <Form.Label className="data-[invalid]:label-invalid mr-3">
                        Superuser
                      </Form.Label>
                      <Form.Control asChild>
                        <Checkbox
                          checked={isSuperUser}
                          id="is_superuser"
                          className="relative top-0.5"
                          onCheckedChange={(value) => {
                            handleInput({ target: { name: "is_superuser", value: Boolean(value) } });
                            setIsSuperUser(Boolean(value));
                            if (value) {
                              handleInput({ target: { name: "user_level", value: "SUPER_ADMIN" } });
                            } else {
                              handleInput({ target: { name: "user_level", value: isProjectAdmin ? "PROJECT_ADMIN" : "USER" } });
                            }
                          }}
                        />
                      </Form.Control>
                    </div>
                  </Form.Field>
                  <Form.Field name="user_level">
                    <div>
                      <Form.Label className="data-[invalid]:label-invalid mr-3">
                        Project Admin
                      </Form.Label>
                      <Form.Control asChild>
                        <Checkbox
                          checked={isProjectAdmin}
                          id="user_level"
                          className="relative top-0.5"
                          disabled={isSuperUser}
                          onCheckedChange={(value) => {
                            const newValue = Boolean(value);
                            setIsProjectAdmin(newValue);
                            handleInput({
                              target: { 
                                name: "user_level", 
                                value: newValue ? "PROJECT_ADMIN" : "USER" 
                              },
                            });
                          }}
                        />
                      </Form.Control>
                    </div>
                  </Form.Field>
                </>
              )}
            </div>
          </div>

          <div className="float-right">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
              className="mr-3"
            >
              {cancelText}
            </Button>

            <Form.Submit asChild>
              <Button className="mt-8">{confirmationText}</Button>
            </Form.Submit>
          </div>
        </Form.Root>
      </BaseModal.Content>
    </BaseModal>
  );
}
