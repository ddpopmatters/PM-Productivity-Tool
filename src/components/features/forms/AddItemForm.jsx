import React, { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import Button from '../../ui/Button';

const AddItemForm = ({
  onSubmit,
  onBack,
  availableTags = [],
  TEAMS = [],
  USERS = [],
  TIMELINE_TYPES = [],
  inputBaseClasses = "px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent",
  selectBaseClasses = "px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("Idea");
  const [team, setTeam] = useState(TEAMS[0] || "");
  const [owner, setOwner] = useState(USERS[0] || "");
  const [collaborators, setCollaborators] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [caption, setCaption] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");

  // Timeline State
  const [timelineType, setTimelineType] = useState("date");
  const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 10));
  const [monthValue, setMonthValue] = useState(new Date().toISOString().slice(0, 7));
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()));
  const [quarterValue, setQuarterValue] = useState(String(Math.floor(new Date().getMonth() / 3) + 1));
  const [formError, setFormError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!title.trim()) {
      setFormError("Title is required");
      return;
    }

    // Validate timeline fields
    if ((timelineType === "quarter" || timelineType === "year") && !yearValue) {
      setFormError("Please enter a year for the timeline");
      return;
    }

    let timelineValue = "";
    if (timelineType === "date") timelineValue = dateValue;
    else if (timelineType === "month") timelineValue = monthValue;
    else if (timelineType === "quarter") timelineValue = `${yearValue}-Q${quarterValue}`;
    else if (timelineType === "year") timelineValue = String(yearValue);

    onSubmit({
      title,
      team,
      owner,
      collaborators,
      documents,
      tags,
      caption,
      workflowStatus: "Idea",
      startDate: startDate || undefined,
      date: deadline || new Date().toISOString().slice(0, 10),
      timelineType,
      timelineValue,
      status: "active"
    });
  };

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-ocean-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ocean-900">Add New Item</h2>
          <Button variant="ghost" onClick={onBack} className="text-graystone-500 hover:text-ocean-600">
            <Icon name="x" className="w-5 h-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Form Error */}
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          {/* Project Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
              <Icon name="file-text" className="w-5 h-5 text-ocean-500" />
              Project Details
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-graystone-700 required-indicator">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={clsx(inputBaseClasses, !title.trim() && "border-graystone-300")}
                placeholder="e.g. Q4 Marketing Campaign"
                required
                aria-required="true"
              />
              {!title.trim() && (
                <p className="validation-message validation-error">Title is required</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-graystone-700">Team</label>
                <select
                  value={team}
                  onChange={e => setTeam(e.target.value)}
                  className={clsx(selectBaseClasses, "w-full")}
                >
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-graystone-700">Owner</label>
                <select
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  className={clsx(selectBaseClasses, "w-full")}
                >
                  {USERS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Collaboration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
              <Icon name="users" className="w-5 h-5 text-ocean-500" />
              Collaboration
            </h3>
            <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-graystone-700">Collaborators</label>
                <div className="flex flex-wrap gap-2">
                  {USERS.map(user => {
                    const isSelected = collaborators.includes(user);
                    return (
                      <button
                        key={user}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCollaborators(collaborators.filter(c => c !== user));
                          } else {
                            setCollaborators([...collaborators, user]);
                          }
                        }}
                        className={clsx(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                          isSelected
                            ? "bg-ocean-100 text-ocean-700 border-ocean-200"
                            : "bg-white text-graystone-600 border-graystone-200 hover:border-ocean-300"
                        )}
                      >
                        {isSelected && <span className="mr-1">✓</span>}
                        {user}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <label className="text-xs font-medium text-graystone-500 mb-1 block">Teams</label>
                  <div className="flex flex-wrap gap-2">
                    {TEAMS.map(teamName => {
                      const isSelected = collaborators.includes(teamName);
                      return (
                        <button
                          key={teamName}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setCollaborators(collaborators.filter(c => c !== teamName));
                            } else {
                              setCollaborators([...collaborators, teamName]);
                            }
                          }}
                          className={clsx(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                            isSelected
                              ? "bg-purple-100 text-purple-700 border-purple-200"
                              : "bg-white text-graystone-600 border-graystone-200 hover:border-purple-300"
                          )}
                        >
                          {isSelected && <span className="mr-1">✓</span>}
                          {teamName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-graystone-700">Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border-graystone-300 shadow-sm focus:border-ocean-500 focus:ring-ocean-500 text-sm"
                    placeholder="Add a tag and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tagInput.trim()) {
                          setTags([...tags, tagInput.trim()]);
                          setTagInput("");
                        }
                      }
                    }}
                    list="tag-suggestions"
                  />
                  <datalist id="tag-suggestions">
                    {availableTags.map(tag => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                  <Button
                    type="button"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setTags([...tags, tagInput.trim()]);
                        setTagInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-graystone-100 text-graystone-700 text-xs font-medium">
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((_, index) => index !== i))}
                          className="text-graystone-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
              <Icon name="calendar" className="w-5 h-5 text-ocean-500" />
              Timeline
            </h3>

            {/* Start Date and Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-graystone-700">Start Date (Optional)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={inputBaseClasses}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-graystone-700">Deadline (Optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  min={startDate || undefined}
                  className={inputBaseClasses}
                />
                {startDate && deadline && new Date(deadline) < new Date(startDate) && (
                  <p className="text-xs text-red-500 mt-1">Deadline must be after start date</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-ocean-50 rounded-xl space-y-4 border border-ocean-100">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ocean-900">Timeline Precision</label>
                <div className="flex gap-2">
                  {TIMELINE_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setTimelineType(type.value)}
                      className={clsx(
                        "flex-1 py-1.5 text-xs rounded-lg border transition-all",
                        timelineType === type.value
                          ? "bg-white border-ocean-300 text-ocean-900 shadow-sm font-semibold"
                          : "border-transparent text-ocean-600 hover:bg-white/50"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ocean-900">
                  {TIMELINE_TYPES.find(t => t.value === timelineType)?.label} Value
                </label>

                {timelineType === "date" && (
                  <input
                    type="date"
                    value={dateValue}
                    onChange={e => setDateValue(e.target.value)}
                    className={inputBaseClasses}
                  />
                )}

                {timelineType === "month" && (
                  <input
                    type="month"
                    value={monthValue}
                    onChange={e => setMonthValue(e.target.value)}
                    className={inputBaseClasses}
                  />
                )}

                {timelineType === "quarter" && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={yearValue}
                      onChange={e => setYearValue(e.target.value)}
                      className={inputBaseClasses}
                      placeholder="Year"
                    />
                    <select
                      value={quarterValue}
                      onChange={e => setQuarterValue(e.target.value)}
                      className={clsx(selectBaseClasses, "w-full")}
                    >
                      {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                    </select>
                  </div>
                )}

                {timelineType === "year" && (
                  <input
                    type="number"
                    value={yearValue}
                    onChange={e => setYearValue(e.target.value)}
                    className={inputBaseClasses}
                    placeholder="Year"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
              <Icon name="paperclip" className="w-5 h-5 text-ocean-500" />
              Attachments
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-graystone-700">Relevant Documents</label>
              <div className="border-2 border-dashed border-graystone-200 rounded-xl p-6 text-center hover:bg-graystone-50 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={e => setDocuments(Array.from(e.target.files).map(f => f.name))}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="bg-ocean-50 p-3 rounded-full">
                    <Icon name="upload-cloud" className="w-6 h-6 text-ocean-600" />
                  </div>
                  <span className="text-sm font-medium text-ocean-700">Click to upload documents</span>
                  <span className="text-xs text-graystone-500">SharePoint Integration</span>
                </label>
                {documents.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {documents.map((doc, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-white border border-graystone-200 px-2 py-1 rounded-md text-graystone-700">
                        <Icon name="file" className="w-3 h-3" />
                        {doc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
              <Icon name="align-left" className="w-5 h-5 text-ocean-500" />
              Description
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-graystone-700">Description / Caption</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                className={clsx(inputBaseClasses, "min-h-[100px]")}
                placeholder="Brief description of the task..."
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="submit" variant="solid" className="flex-1">Create Item</Button>
            <Button type="button" variant="ghost" onClick={onBack}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemForm;
