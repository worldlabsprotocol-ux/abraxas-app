// FILE: lib/vos/commandRegistry.ts
// Central command registry. Add new commands via registerCommand().
// Parser splits raw input → resolves command → executes handler.
import type { CommandDefinition, CommandHandler, CommandContext, AssetRegistry, LogLine } from "./types";

class CommandRegistryImpl {
  private commands: Map<string, CommandDefinition> = new Map();
  private aliases:  Map<string, string>            = new Map();

  register(def: CommandDefinition): void {
    this.commands.set(def.name.toLowerCase(), def);
    (def.aliases || []).forEach(a => this.aliases.set(a.toLowerCase(), def.name.toLowerCase()));
  }

  resolve(name: string): CommandDefinition | undefined {
    const key = name.toLowerCase().trim();
    if (this.commands.has(key)) return this.commands.get(key);
    const aliased = this.aliases.get(key);
    return aliased ? this.commands.get(aliased) : undefined;
  }

  all(): CommandDefinition[] {
    return Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Parse "show provenance AAS-1" into command="show provenance" args=["AAS-1"]
  // Multi-word commands are resolved by trying longest match first.
  parse(raw: string): { command?: CommandDefinition; args: string[] } {
    const tokens = raw.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { args: [] };

    // Try two-token compound commands first (e.g. "show provenance")
    if (tokens.length >= 2) {
      const compound = `${tokens[0]} ${tokens[1]}`.toLowerCase();
      const cmd = this.resolve(compound);
      if (cmd) return { command: cmd, args: tokens.slice(2) };
    }
    // Fall back to single-token
    const cmd = this.resolve(tokens[0]);
    return { command: cmd, args: tokens.slice(1) };
  }

  async execute(
    raw: string,
    registry: AssetRegistry,
    emit: (line: Omit<LogLine, "ts">) => void,
    history: string[],
  ): Promise<void> {
    const trimmed = raw.trim();
    if (!trimmed) return;

    emit({ kind: "user", text: trimmed });

    const { command, args } = this.parse(trimmed);
    if (!command) {
      emit({ kind: "error", text: `Unknown command: '${trimmed}'. Type 'help' to list commands.` });
      return;
    }

    if (command.future) {
      emit({ kind: "agent", text: `[Agent] Resolving '${command.name}' protocol module...` });
      await wait(180);
      emit({ kind: "agent", text: `[Agent] Module not yet activated on this network.` });
      emit({ kind: "out",   text: `${command.name.toUpperCase()} — module reserved. Available in protocol phase 2.` });
      return;
    }

    const ctx: CommandContext = { args, raw: trimmed, emit, registry, history };
    try {
      await command.handler(ctx);
    } catch (err) {
      emit({ kind: "error", text: `Execution error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }
}

export const commandRegistry = new CommandRegistryImpl();

// Helper exposed to command handlers for agent activity timing.
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Re-export the type so handlers can import a single module
export type { CommandDefinition, CommandHandler, CommandContext };
