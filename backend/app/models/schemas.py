"""Pydantic request/response schemas."""
from pydantic import BaseModel, Field


class DepositRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Deposit amount")


class EnrollFaceRequest(BaseModel):
    embedding: list[float] = Field(..., min_length=128, max_length=128)


class FacePayRequest(BaseModel):
    embedding: list[float] = Field(..., min_length=128, max_length=128)
    amount: float = Field(..., gt=0)
    currency: str = "TZS"


class ChargeByFaceRequest(BaseModel):
    embedding: list[float] = Field(..., min_length=128, max_length=128)
    amount: float = Field(..., gt=0)
    currency: str = "TZS"
    reference: str | None = None


class RegisterCustomerRequest(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    email: str | None = None
    wallet_provider: str
    wallet_phone: str | None = None
    embedding: list[float] = Field(..., min_length=128, max_length=128)


class CreateTemboWalletRequest(BaseModel):
    firstName: str
    lastName: str
    dateOfBirth: str
    gender: str = Field(..., pattern="^(M|F)$")
    idType: str = Field(
        ...,
        pattern="^(NATIONAL_ID|DRIVER_LICENSE|VOTER_ID|INTL_PASSPORT)$",
    )
    idNumber: str
    idIssueDate: str
    idExpiryDate: str
    street: str
    city: str
    postalCode: str
    mobileNo: str
    email: str
