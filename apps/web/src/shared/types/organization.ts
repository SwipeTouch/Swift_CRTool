export interface DesignatedRaiser {
  id?: string;
  fullName: string;
  email: string;
  password?: string;
  isDesignatedRaiser?: boolean;
}

export interface OrganizationRow {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  country: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  primaryContactName?: string | null;
  slaDays: number;
  status: string;
  users?: DesignatedRaiser[];
  _count: { users: number; changeRequests: number };
}

export interface OrganizationFormValues {
  name: string;
  code: string;
  city?: string;
  country?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  primaryContactName?: string;
  slaDays?: number;
  status?: string;
  raiser1Name?: string;
  raiser1Email?: string;
  raiser1Password?: string;
  raiser2Name?: string;
  raiser2Email?: string;
  raiser2Password?: string;
}

export function formToOrgPayload(values: OrganizationFormValues, existing?: OrganizationRow) {
  const raisers: DesignatedRaiser[] = [];
  if (values.raiser1Email && values.raiser1Name) {
    raisers.push({
      id: existing?.users?.[0]?.id,
      fullName: values.raiser1Name,
      email: values.raiser1Email,
      password: values.raiser1Password,
    });
  }
  if (values.raiser2Email && values.raiser2Name) {
    raisers.push({
      id: existing?.users?.[1]?.id,
      fullName: values.raiser2Name,
      email: values.raiser2Email,
      password: values.raiser2Password,
    });
  }

  return {
    name: values.name,
    code: values.code,
    city: values.city,
    country: values.country,
    address: values.address,
    contactPhone: values.contactPhone,
    contactEmail: values.contactEmail,
    primaryContactName: values.primaryContactName,
    slaDays: values.slaDays,
    status: values.status,
    designatedRaisers: raisers,
  };
}

export function orgToFormValues(org?: OrganizationRow): Partial<OrganizationFormValues> {
  if (!org) return { country: 'India', slaDays: 14, status: 'active' };
  const r0 = org.users?.[0];
  const r1 = org.users?.[1];
  return {
    name: org.name,
    code: org.code,
    city: org.city ?? undefined,
    country: org.country,
    address: org.address ?? undefined,
    contactPhone: org.contactPhone ?? undefined,
    contactEmail: org.contactEmail ?? undefined,
    primaryContactName: org.primaryContactName ?? undefined,
    slaDays: org.slaDays,
    status: org.status,
    raiser1Name: r0?.fullName,
    raiser1Email: r0?.email,
    raiser2Name: r1?.fullName,
    raiser2Email: r1?.email,
  };
}
