"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

type Option = { value: string; label: string; disabled?: boolean };

// Searchable shadcn combobox. Writes the chosen value to a hidden input for form submission.
export function Combobox({
  options,
  value,
  onChange,
  name,
  placeholder = "— เลือก —",
  searchPlaceholder = "ค้นหา…",
  allowCustom = false,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean; // typing a value not in the list can still be chosen
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((o) => o.value === value);
  const q = search.trim();
  const showCustom = allowCustom && q.length > 0 && !options.some((o) => o.value === q);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex min-h-[54px] w-full items-center justify-between rounded-[14px] border border-line bg-white px-4 text-left text-[18px]">
          <span className={value ? "" : "text-muted-foreground"}>
            {selected ? selected.label : value || placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{allowCustom ? "พิมพ์แล้วกดเพิ่มได้เลย" : "ไม่พบรายการ"}</CommandEmpty>
              <CommandGroup>
                {showCustom && (
                  <CommandItem value={q} onSelect={() => pick(q)}>
                    <Check className="mr-2 size-4 opacity-0" />
                    เพิ่ม “{q}”
                  </CommandItem>
                )}
                {options.map((o) => (
                  <CommandItem key={o.value} value={o.label} disabled={o.disabled} onSelect={() => pick(o.value)}>
                    <Check className={cn("mr-2 size-4", value === o.value ? "opacity-100" : "opacity-0")} />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
