type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function createFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function getLocalParts(formatter: Intl.DateTimeFormat, instant: number): LocalParts {
  const fields = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  return {
    year: Number(fields.year),
    month: Number(fields.month),
    day: Number(fields.day),
    hour: Number(fields.hour),
    minute: Number(fields.minute),
    second: Number(fields.second),
  };
}

function isRequestedLocalTime(parts: LocalParts, requested: LocalParts) {
  return parts.year === requested.year
    && parts.month === requested.month
    && parts.day === requested.day
    && parts.hour === requested.hour
    && parts.minute === requested.minute
    && parts.second === requested.second;
}

/**
 * Converts a wall-clock time in an IANA time zone to an absolute instant.
 * Returns null for a nonexistent local time during a spring-forward gap. During a
 * fall-back overlap, it selects the first matching instant that is still in the future.
 */
export function localDateTimeToUtc(
  dateKey: string,
  clock: string,
  timeZone: string,
  notBefore = Date.now(),
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock);
  if (!dateMatch || !timeMatch) return null;

  const requested: LocalParts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: 0,
  };
  const localScalar = Date.UTC(requested.year, requested.month - 1, requested.day, requested.hour, requested.minute, 0);
  if (new Date(localScalar).toISOString().slice(0, 10) !== dateKey) return null;

  try {
    const formatter = createFormatter(timeZone);
    const offsets = new Set<number>();
    for (const hours of [-72, -48, -24, 0, 24, 48, 72]) {
      const probe = localScalar + hours * 60 * 60 * 1000;
      const probeParts = getLocalParts(formatter, probe);
      const representedAsUtc = Date.UTC(probeParts.year, probeParts.month - 1, probeParts.day, probeParts.hour, probeParts.minute, probeParts.second);
      offsets.add(representedAsUtc - probe);
    }

    const candidates = [...offsets]
      .map((offset) => localScalar - offset)
      .filter((candidate, index, all) => all.indexOf(candidate) === index)
      .filter((candidate) => isRequestedLocalTime(getLocalParts(formatter, candidate), requested))
      .sort((left, right) => left - right);

    if (candidates.length === 0) return null;
    const futureCandidate = candidates.find((candidate) => candidate >= notBefore);
    return new Date(futureCandidate ?? candidates[0]);
  } catch {
    return null;
  }
}
