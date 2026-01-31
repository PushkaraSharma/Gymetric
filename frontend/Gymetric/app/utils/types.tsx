export type ClientDetailsType = {
    id?: number
    name: string,
    phoneNumber: string,
    age?: number | null,
    birthday?: Date | null,
    gender: string,
    profilePicture?: string,
}

type DependentType = { name: string, phoneNumber: string, gender: string, id?: number }

export type ClientOnBoardingType = {
    primaryDetails: ClientDetailsType,
    dependents: DependentType[]
    amount: number,
    method: string,
    paymentReceived: boolean,
    startDate: Date
}

export type MembershipRenewType = {
    id: number,
    amount: number,
    method: string,
    paymentReceived: boolean,
    startDate: Date,
    dependents: DependentType[]
}

export type ClientDateType = { visible: boolean, type: 'birthday' | 'startDate' };

export type STEPS = "Personal Info" | "Membership" | "Payment";

export interface ApiConfig {
    url: string
    timeout: number
}

export type BackendResponse<T> = {
    success: boolean
    data?: T
    message?: string
}

export type ApiResult = { kind: "ok"; data: any } | { kind: "error"; message: string }