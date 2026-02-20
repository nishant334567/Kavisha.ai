"use client"

import { client } from "@/app/lib/sanity";
import { useState, useEffect, useCallback } from "react";

const DATE_PRESETS = [
    { value: "all", label: "All time" },
    { value: "1", label: "Last 1 day" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "custom", label: "Custom range" },
];



function buildQueryParams(brand, filters) {
    const params = new URLSearchParams();
    params.set("brand", brand);
    params.set("type", "normal");
    params.set("limit", "all");

    if (filters.datePreset === "custom" && filters.dateFrom && filters.dateTo) {
        params.set("dateFrom", filters.dateFrom);
        params.set("dateTo", filters.dateTo);
    } else if (filters.datePreset && filters.datePreset !== "all") {
        params.set("lastDays", filters.datePreset);
    }
    if (filters.dateField) {
        params.set("dateField", filters.dateField);
    }
    if (filters.serviceKey && filters.serviceKey !== "") {
        params.set("serviceKey", filters.serviceKey);
    }

    return params.toString();
}

export function useChatRequests(brand) {
    const [filters, setFilters] = useState({
        datePreset: "all",
        dateFrom: null,
        dateTo: null,
        dateField: "updatedAt",
        serviceKey: "",
    });
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [servicesDropDown, setServicesDropdown] = useState([]);

    const fetchWithFilters = useCallback(async (filtersToApply) => {
        if (!brand?.subdomain) return;
        setLoading(true);
        try {
            const query = buildQueryParams(brand.subdomain, filtersToApply);
            const response = await fetch(`/api/admin/fetch-sessions?${query}`);
            const data = await response.json();
            if (data.success) {
                setUsers(data.users ?? []);
                setTotal(data.total ?? (data.users?.length ?? 0));
            } else {
                setUsers([]);
                setTotal(0);
            }
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
            setUsers([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [brand?.subdomain]);
    const getAllServices = useCallback(async (brandname) => {
        const query = `
    *[_type == "brand" && subdomain == $brandname][0]{
      services[]{
        _key,
        name,
        title
      }
    }
  `;

        const data = await client.fetch(query, { brandname });
        setServicesDropdown([{ _key: "", name: "All", title: "All" }, ...data?.services])
        console.log("Data services:", data)
    }, [brand?.subdomain]);
    useEffect(() => {
        if (brand?.subdomain) {
            fetchWithFilters(filters);
            getAllServices(brand?.subdomain)
        };

    }, [brand?.subdomain]);

    const applyFilters = useCallback((filtersToApply) => {
        setFilters((prev) => ({ ...prev, ...filtersToApply }));
        fetchWithFilters(filtersToApply);
    }, [fetchWithFilters]);

    return {
        users,
        total,
        loading,
        filters,
        applyFilters,
        datePresets: DATE_PRESETS,
        servicesDropDown,
    };
}