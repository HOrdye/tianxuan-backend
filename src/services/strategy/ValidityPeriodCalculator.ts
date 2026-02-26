export class ValidityPeriodCalculator {
  static calculateNextYearTransition(currentDate: Date): Date {
    const currentYear = currentDate.getFullYear();
    const nextYearStart = new Date(currentYear + 1, 1, 4);
    return nextYearStart;
  }

  static calculateNextMonthTransition(currentDate: Date): Date {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth;
  }

  static getNextMajorTransition(chart: any, currentDate: Date): Date {
    const nextYear = this.calculateNextYearTransition(currentDate);
    const nextMonth = this.calculateNextMonthTransition(currentDate);
    
    return nextMonth < nextYear ? nextMonth : nextYear;
  }

  static calculateValidityPeriod(chart: any): {
    startDate: string;
    endDate: string;
    urgency: 'high' | 'medium' | 'low';
  } {
    const currentDate = new Date();
    const endDate = this.getNextMajorTransition(chart, currentDate);
    
    const daysUntilExpiry = Math.floor(
      (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const urgency: 'high' | 'medium' | 'low' = 
      daysUntilExpiry < 30 ? 'high' : 
      daysUntilExpiry < 90 ? 'medium' : 'low';
    
    return {
      startDate: currentDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      urgency,
    };
  }
}
