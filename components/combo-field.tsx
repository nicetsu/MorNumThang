"use client";

import { useState } from "react";
import { Combobox } from "@/components/combobox";

// Thin client wrapper so the (controlled) Combobox can be dropped into a server-action
// form: holds the value state, seeded from defaultValue, and submits via its hidden input.
export function ComboField({
  name,
  label,
  options,
  defaultValue = "",
  placeholder,
  searchPlaceholder,
  allowCustom = true,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Combobox
      name={name}
      label={label}
      value={value}
      onChange={setValue}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      allowCustom={allowCustom}
    />
  );
}
