import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { login, register } = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }));
vi.mock("../api/client", () => ({ api: { login, register } }));

import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  beforeEach(() => { login.mockReset(); register.mockReset(); });

  it("submits credentials through the selected login/register flow", async () => {
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);
    fireEvent.change(document.querySelector<HTMLInputElement>('input[autocomplete="username"]')!, { target: { value: "alice" } });
    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="password"]')!, { target: { value: "long-password" } });
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>(".auth-tabs button")[1]);
    register.mockResolvedValue(undefined);
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(register).toHaveBeenCalledWith("alice", "long-password"));
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });

  it("shows a server error and keeps the user unauthenticated", async () => {
    const onAuthenticated = vi.fn();
    login.mockRejectedValue(new Error("Invalid login or password."));
    render(<AuthScreen onAuthenticated={onAuthenticated} />);
    fireEvent.change(document.querySelector<HTMLInputElement>('input[autocomplete="username"]')!, { target: { value: "alice" } });
    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="password"]')!, { target: { value: "secret-password" } });
    fireEvent.submit(document.querySelector("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login or password.");
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
