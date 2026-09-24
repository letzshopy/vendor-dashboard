"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useState,
  useTransition,
} from "react";
import {
  Search,
  X,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";

export default function CustomersSearch({
  initialSearch = "",
}: {
  initialSearch?: string;
}) {
  const router = useRouter();
  const params =
    useSearchParams();
  const [q, setQ] =
    useState(initialSearch);
  const [isPending, startTransition] =
    useTransition();

  function navigate(
    nextSearch: string
  ) {
    const usp =
      new URLSearchParams(
        params.toString()
      );

    usp.set("page", "1");

    if (nextSearch) {
      usp.set(
        "search",
        nextSearch
      );
    } else {
      usp.delete("search");
    }

    startTransition(() => {
      router.push(
        `/customers?${usp.toString()}`
      );
    });
  }

  function onSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    navigate(q.trim());
  }

  function clearSearch() {
    setQ("");
    navigate("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"
      role="search"
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />

        <Input
          value={q}
          onChange={(event) =>
            setQ(
              event.target.value
            )
          }
          placeholder="Search name, email or phone"
          className="pl-10"
          aria-label="Search customers"
        />
      </div>

      <div className="flex shrink-0 gap-2">
        <AsyncButton
          type="submit"
          loading={isPending}
          loadingLabel="Searching…"
          className="flex-1 sm:flex-none"
        >
          Search
        </AsyncButton>

        {(q || initialSearch) ? (
          <Button
            type="button"
            variant="outline"
            onClick={clearSearch}
            disabled={isPending}
            className="flex-1 sm:flex-none"
          >
            <X
              aria-hidden="true"
              className="h-4 w-4"
            />
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
