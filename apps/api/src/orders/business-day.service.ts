import { Injectable } from '@nestjs/common';

export interface BusinessDay {
  date: Date;
  dateString: string;
}

@Injectable()
export class BusinessDayService {
  getBusinessDay(
    negocio: { zonaHoraria: string; corteDiaHora: string },
    now: Date = new Date(),
  ): BusinessDay {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: negocio.zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);

    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);

    let year = get('year');
    let month = get('month');
    let day = get('day');
    const hour = get('hour');
    const minute = get('minute');

    const [cutoffHour, cutoffMinute] = this.parseCutoff(
      negocio.corteDiaHora,
    );

    if (hour < cutoffHour || (hour === cutoffHour && minute < cutoffMinute)) {
      const previous = new Date(Date.UTC(year, month - 1, day));
      previous.setUTCDate(previous.getUTCDate() - 1);
      year = previous.getUTCFullYear();
      month = previous.getUTCMonth() + 1;
      day = previous.getUTCDate();
    }

    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(
      day,
    ).padStart(2, '0')}`;

    return {
      date: new Date(`${dateString}T00:00:00.000Z`),
      dateString,
    };
  }

  private parseCutoff(value: string): [number, number] {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return [4, 0];

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (hour > 23 || minute > 59) return [4, 0];
    return [hour, minute];
  }
}
