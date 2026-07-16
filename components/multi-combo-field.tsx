"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

// Multi-select built on the same shadcn Command/Popover primitives as Combobox.
// Picks stay in a "·"-joined hidden input (the format lib/rights.ts already splits on),
// shown as removable chips. Typing a value not in the list can be added too.
export function MultiComboField({
  name,
  label,
  options,
  defaultValue = "",
  placeholder = "— เลือกได้หลายรายการ —",
  searchPlaceholder = "ค้นหา/พิมพ์เพิ่ม…",
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(
    defaultValue.split(/[·,\n]+/).map((s) => s.trim()).filter(Boolean),
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (v: string) =>
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const remove = (v: string) => setSelected((prev) => prev.filter((x) => x !== v));

  const q = search.trim();
  const showCustom = q.length > 0 && !options.some((o) => o.value === q) && !selected.includes(q);

  return (
    <div>
      <span className="field-label">{label}</span>
      {/* Value submitted with the form — "·"-separated to match the stored format. */}
      <input type="hidden" name={name} value={selected.join(" · ")} />

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => remove(s)}
              className="flex items-center gap-1 rounded-full bg-teal-soft px-3 py-1.5 text-sm font-bold text-teal"
            >
              {s}
              <X className="size-3.5" />
            </button>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex min-h-[54px] w-full items-center justify-between rounded-[14px] border border-line bg-white px-4 text-left text-[18px]">
          <span className="text-muted-foreground">
            {selected.length ? "เพิ่ม/แก้รายการ" : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>พิมพ์แล้วกดเพิ่มได้เลย</CommandEmpty>
              <CommandGroup>
                {showCustom && (
                  <CommandItem
                    value={q}
                    onSelect={() => {
                      toggle(q);
                      setSearch("");
                    }}
                  >
                    <Check className="mr-2 size-4 opacity-0" />
                    เพิ่ม “{q}”
                  </CommandItem>
                )}
                {options.map((o) => (
                  <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                    <Check
                      className={cn("mr-2 size-4", selected.includes(o.value) ? "opacity-100" : "opacity-0")}
                    />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
