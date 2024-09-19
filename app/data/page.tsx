import React from "react";
import programs from "@/assets/other_programs.json";

const ProgramsList = () => {
  return (
    <div className="bg-gray-100 min-h-screen py-10">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-10 text-gray-800">
          Available Programs
        </h1>
        <div className="overflow-x-auto">
          <table className="table-auto w-full bg-white shadow-lg rounded-lg">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="py-4 px-6 text-left w-1/6">Program</th>
                <th className="py-4 px-6 text-left w-2/5">Description</th>
                <th className="py-4 px-6 text-left w-1/4">Benefits</th>
                <th className="py-4 px-6 text-left w-1/4">Eligibility Criteria</th>
                <th className="py-4 px-6 text-left w-1/5">Contact Info</th>
                <th className="py-4 px-6 text-left w-1/5">Links to Apply</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program, index) => (
                <tr
                  key={index}
                  className={`border-b ${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-gray-100`}
                >
                  <td className="py-4 px-6 font-semibold text-blue-600">
                    {program.program}
                  </td>
                  <td className="py-4 px-6">{program.description}</td>
                  <td className="py-4 px-6">
                    <ul className="list-disc list-inside">
                      {program.benefits.map((benefit, idx) => (
                        <li key={idx}>{benefit}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-4 px-6">
                    <ul className="list-disc list-inside">
                      {program.eligibility_criteria.map((criteria, idx) => (
                        <li key={idx}>{criteria}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-4 px-6">
                    <strong>Agency: </strong>{program.contact_info.agency} <br />
                    <strong>Phone: </strong>{program.contact_info.phone}
                  </td>
                  <td className="py-4 px-6">
                    <ul className="list-disc list-inside">
                      {program.links_to_apply.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProgramsList;
