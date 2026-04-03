import { Prisma } from "@prisma/client";

export function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(4));
}

export function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}
