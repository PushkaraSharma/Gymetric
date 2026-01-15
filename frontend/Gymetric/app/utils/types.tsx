export type ClientFormType = {
    name: string,
    phoneNumber: string,
    age: number | null,
    birthday: Date | null,
    gender: string,
    amount?: number,
    method?: string,
    paymentReceived?: boolean,
    startDate?: Date
}

export type ClientDateType = { visible: boolean, type: 'birthday' | 'startDate' }